<script lang="ts">
	import '../app.css';

	import { onMount } from 'svelte';
	import { base, resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	import { clock } from '$lib/stores/clock.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { sunState, type GeoPoint } from '$lib/astro/solar';
	import { effectiveTime } from '$lib/time';
	import { resolveSources } from '$lib/config';
	import { computeMapRect, insideRect, unproject } from '$lib/map/projection';
	import { setMapView } from '$lib/map/view';

	import MapCanvas from '$lib/components/MapCanvas.svelte';
	import Toolbar from '$lib/components/Toolbar.svelte';
	import SettingsPanel from '$lib/components/SettingsPanel.svelte';
	import LoadingScreen from '$lib/components/LoadingScreen.svelte';

	let { children } = $props();

	// ---- live state ---------------------------------------------------------
	let w = $state(0);
	let h = $state(0);
	let settingsOpen = $state(false);
	let uiHidden = $state(false);
	let active = $state(true); // pointer activity, drives auto-hide
	let isFullscreen = $state(false);
	let cursor = $state<GeoPoint | null>(null);
	let mapReady = $state(false);
	let mapClick = $state<((point: GeoPoint) => void) | null>(null);

	// ---- derived model ------------------------------------------------------
	const st = $derived(settings.current);
	const time = $derived(effectiveTime(clock.now, st.time));
	const sun = $derived(sunState(time));
	const sources = $derived(resolveSources(base, st.texture));
	const rect = $derived(computeMapRect(w, h, st.map.fit));
	const prayerView = $derived(page.route.id === '/prayer');
	const prayerEnabled = $derived(st.prayer.enabled);

	const params = $derived({
		nightBrightness: st.map.nightBrightness,
		twilight: st.map.softTwilight
			? Math.sin((st.map.twilightDegrees * Math.PI) / 180)
			: 0.008,
		dusk: st.map.softTwilight ? st.map.dusk : 0,
		fit: st.map.fit
	});

	const controlsVisible = $derived(settingsOpen || !st.ui.autoHide || active);

	setMapView({
		get width() {
			return w;
		},
		get height() {
			return h;
		},
		get rect() {
			return rect;
		},
		get time() {
			return time;
		},
		get sun() {
			return sun;
		},
		get cursor() {
			return cursor;
		},
		get uiHidden() {
			return uiHidden;
		},
		onMapClick(handler) {
			mapClick = handler;
			return () => {
				if (mapClick === handler) mapClick = null;
			};
		}
	});

	// ---- behavior -----------------------------------------------------------
	let hideTimer: ReturnType<typeof setTimeout> | undefined;
	function poke() {
		active = true;
		clearTimeout(hideTimer);
		if (st.ui.autoHide) hideTimer = setTimeout(() => (active = false), 3000);
	}

	function onPointerMove(e: PointerEvent) {
		poke();
		if (st.layers.coordinates && insideRect(e.clientX, e.clientY, rect)) {
			cursor = unproject(e.clientX, e.clientY, rect);
		} else {
			cursor = null;
		}
	}

	// A press and release in about the same spot on the map itself (the overlays
	// let pointer events through to the canvas) is a click on the map.
	let pressedAt: { x: number; y: number } | null = null;
	function onPointerDown(e: PointerEvent) {
		pressedAt = { x: e.clientX, y: e.clientY };
	}
	function onPointerUp(e: PointerEvent) {
		const from = pressedAt;
		pressedAt = null;
		if (!mapClick || !from || !(e.target instanceof HTMLCanvasElement)) return;
		if (Math.hypot(e.clientX - from.x, e.clientY - from.y) > 6) return;
		if (insideRect(e.clientX, e.clientY, rect)) mapClick(unproject(e.clientX, e.clientY, rect));
	}

	function toggleFullscreen() {
		if (document.fullscreenElement) {
			document.exitFullscreen().catch(() => {});
		} else {
			document.documentElement.requestFullscreen().catch(() => {});
		}
	}

	function toggleView() {
		goto(prayerView ? resolve('/') : resolve('/prayer/'));
	}

	// The prayer-times view is opt-in: leave it whenever it's off — switched off
	// in settings, or reached by its URL before being switched on.
	$effect(() => {
		if (prayerView && !prayerEnabled) goto(resolve('/'), { replaceState: true });
	});

	function isTyping(target: EventTarget | null): boolean {
		const el = target as HTMLElement | null;
		if (!el) return false;
		const tag = el.tagName;
		return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
	}

	function onKeydown(e: KeyboardEvent) {
		if (isTyping(e.target)) return;
		poke();
		switch (e.key.toLowerCase()) {
			case 'h':
				uiHidden = !uiHidden;
				break;
			case 'f':
				toggleFullscreen();
				break;
			case 'p':
				if (prayerEnabled) toggleView();
				break;
			case 's':
			case ',':
				settingsOpen = !settingsOpen;
				break;
			case 'escape':
				if (settingsOpen) settingsOpen = false;
				break;
		}
	}

	onMount(() => {
		const onFs = () => (isFullscreen = !!document.fullscreenElement);
		document.addEventListener('fullscreenchange', onFs);
		poke();
		return () => {
			document.removeEventListener('fullscreenchange', onFs);
			clearTimeout(hideTimer);
		};
	});
</script>

<svelte:window onkeydown={onKeydown} />

<main
	bind:clientWidth={w}
	bind:clientHeight={h}
	class="fixed inset-0 overflow-hidden"
	class:starfield={st.map.showStars}
	class:pickable={mapClick !== null}
	onpointermove={onPointerMove}
	onpointerleave={() => (cursor = null)}
	onpointerdown={onPointerDown}
	onpointerup={onPointerUp}
>
	{#if w > 0 && h > 0}
		<MapCanvas
			sun={sun.subsolar}
			{params}
			{sources}
			width={w}
			height={h}
			onready={() => (mapReady = true)}
		/>
	{/if}

	{@render children()}

	<div
		class="transition-opacity duration-300"
		class:opacity-0={!controlsVisible}
		class:pointer-events-none={!controlsVisible}
	>
		<Toolbar
			{uiHidden}
			{isFullscreen}
			{prayerView}
			{prayerEnabled}
			onToggleHide={() => (uiHidden = !uiHidden)}
			onToggleFullscreen={toggleFullscreen}
			onSettings={() => (settingsOpen = true)}
		/>
	</div>

	<SettingsPanel open={settingsOpen} {prayerView} onclose={() => (settingsOpen = false)} />
</main>

<LoadingScreen visible={!mapReady} />

<style>
	.pickable :global(canvas) {
		cursor: crosshair;
	}
</style>
