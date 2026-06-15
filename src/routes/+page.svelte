<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';

	import { clock } from '$lib/stores/clock.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { sunState, type GeoPoint } from '$lib/astro/solar';
	import { sublunarPoint, moonPhase } from '$lib/astro/lunar';
	import { effectiveTime } from '$lib/time';
	import { resolveSources, APP_NAME, APP_TAGLINE } from '$lib/config';
	import { computeMapRect, insideRect, unproject } from '$lib/map/projection';

	import MapCanvas from '$lib/components/MapCanvas.svelte';
	import MapOverlay from '$lib/components/MapOverlay.svelte';
	import Hud from '$lib/components/Hud.svelte';
	import Toolbar from '$lib/components/Toolbar.svelte';
	import SettingsPanel from '$lib/components/SettingsPanel.svelte';
	import LoadingScreen from '$lib/components/LoadingScreen.svelte';

	// ---- live state ---------------------------------------------------------
	let w = $state(0);
	let h = $state(0);
	let settingsOpen = $state(false);
	let uiHidden = $state(false);
	let active = $state(true); // pointer activity, drives auto-hide
	let isFullscreen = $state(false);
	let cursor = $state<GeoPoint | null>(null);
	let mapReady = $state(false);

	// ---- derived model ------------------------------------------------------
	const st = $derived(settings.current);
	const time = $derived(effectiveTime(clock.now, st.time));
	const sun = $derived(sunState(time));
	const moon = $derived(sublunarPoint(time));
	const phase = $derived(moonPhase(time));
	const sources = $derived(resolveSources(base, st.texture));
	const rect = $derived(computeMapRect(w, h, st.map.fit));

	const params = $derived({
		nightBrightness: st.map.nightBrightness,
		twilight: st.map.softTwilight
			? Math.sin((st.map.twilightDegrees * Math.PI) / 180)
			: 0.008,
		dusk: st.map.softTwilight ? st.map.dusk : 0,
		fit: st.map.fit
	});

	const controlsVisible = $derived(settingsOpen || !st.ui.autoHide || active);

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

	function toggleFullscreen() {
		if (document.fullscreenElement) {
			document.exitFullscreen().catch(() => {});
		} else {
			document.documentElement.requestFullscreen().catch(() => {});
		}
	}

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

<svelte:head>
	<title>{APP_NAME} — {APP_TAGLINE}</title>
</svelte:head>

<svelte:window onkeydown={onKeydown} />

<main
	bind:clientWidth={w}
	bind:clientHeight={h}
	class="fixed inset-0 overflow-hidden"
	class:starfield={st.map.showStars}
	onpointermove={onPointerMove}
	onpointerleave={() => (cursor = null)}
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
		<MapOverlay
			{rect}
			width={w}
			height={h}
			sun={sun.subsolar}
			{moon}
			declination={sun.declination}
			now={time}
			layers={st.layers}
			scale={st.ui.hudScale}
		/>
	{/if}

	{#if !uiHidden}
		<Hud
			layers={st.layers}
			{time}
			sun={sun.subsolar}
			{moon}
			{phase}
			cursor={st.layers.coordinates ? cursor : null}
			scale={st.ui.hudScale}
			customTime={st.time.mode === 'custom'}
		/>
	{/if}

	<div
		class="transition-opacity duration-300"
		class:opacity-0={!controlsVisible}
		class:pointer-events-none={!controlsVisible}
	>
		<Toolbar
			{uiHidden}
			{isFullscreen}
			onToggleHide={() => (uiHidden = !uiHidden)}
			onToggleFullscreen={toggleFullscreen}
			onSettings={() => (settingsOpen = true)}
		/>
	</div>

	<SettingsPanel open={settingsOpen} onclose={() => (settingsOpen = false)} />
</main>

<LoadingScreen visible={!mapReady} />
