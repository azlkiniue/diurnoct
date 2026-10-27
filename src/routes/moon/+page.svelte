<script lang="ts">
	import { settings } from '$lib/stores/settings.svelte';
	import { sublunarPoint, moonPhase, nextNewAndFullMoon } from '$lib/astro/lunar';
	import { moonLines, moonTimeline, upAndNext } from '$lib/astro/moon';
	import { CITIES } from '$lib/astro/cities';
	import { solarDay } from '$lib/astro/solar';
	import { APP_NAME } from '$lib/config';
	import { getMapView } from '$lib/map/view';
	import { placePicker } from '$lib/map/place.svelte';
	import { viewById, viewLayers } from '$lib/views';

	import MapOverlay from '$lib/components/MapOverlay.svelte';
	import MoonOverlay from '$lib/components/MoonOverlay.svelte';
	import MoonLegend from '$lib/components/MoonLegend.svelte';
	import MoonPanel from '$lib/components/MoonPanel.svelte';
	import Hud from '$lib/components/Hud.svelte';

	// The map, clock and controls live in the layout; this view adds the lines
	// where the moon is rising, highest and setting right now, where it lights
	// the night, and a panel of moon times for one place.
	const view = getMapView();

	const st = $derived(settings.current);
	const moonSt = $derived(st.moon);
	const lines = $derived(moonLines(view.time));

	// The same pinned place as the prayer view; clicks snap to the city dots when they're shown.
	const picker = placePicker({
		active: () => moonSt.panel,
		markers: () => (st.layers.cities ? CITIES : [])
	});

	// Recomputed once per solar day at the place, not every tick.
	const place = $derived(moonSt.panel ? picker.place : null);
	const day = $derived(place ? solarDay(place.lon, view.time) : 0);
	const timeline = $derived(place ? moonTimeline(place, day) : null);
	const status = $derived(timeline ? upAndNext(timeline, view.time) : null);

	const layers = $derived(viewLayers(viewById('moon'), st.layers));
	const moon = $derived(sublunarPoint(view.time));
	const phase = $derived(moonPhase(view.time));
	const phases = $derived(nextNewAndFullMoon(view.time));
</script>

<svelte:head>
	<title>{APP_NAME} — moonrise & moonset map</title>
	<meta
		name="description"
		content="A live world map of where the moon is rising, highest in the sky and setting right now."
	/>
</svelte:head>

{#snippet legend()}
	<!-- On phones the panel and the line labels already key the colours. -->
	<div class={moonSt.panel ? 'hidden sm:block' : ''}>
		<MoonLegend {phase} />
	</div>
{/snippet}

{#snippet panel()}
	<MoonPanel
		{place}
		{timeline}
		up={status?.up ?? false}
		next={status?.next ?? null}
		{phase}
		{phases}
		now={view.time}
		locating={picker.locating}
		locateError={picker.locateError}
		onlocate={picker.locate}
		onclear={picker.clear}
	/>
{/snippet}

{#if view.width > 0 && view.height > 0}
	<MoonOverlay
		rect={view.rect}
		width={view.width}
		height={view.height}
		{lines}
		moonLat={moon.lat}
		labels={moonSt.labels}
		{place}
		scale={st.ui.hudScale}
	/>
	<MapOverlay
		rect={view.rect}
		width={view.width}
		height={view.height}
		sun={view.sun.subsolar}
		{moon}
		declination={view.sun.declination}
		now={view.time}
		{layers}
		scale={st.ui.hudScale}
	/>
{/if}

{#if !view.uiHidden}
	<Hud
		{layers}
		time={view.time}
		sun={view.sun.subsolar}
		{moon}
		{phase}
		cursor={st.layers.coordinates ? view.cursor : null}
		scale={st.ui.hudScale}
		customTime={st.time.mode === 'custom'}
		tagline="moonrise, transit & moonset"
		legend={moonSt.legend ? legend : undefined}
		aside={moonSt.panel ? panel : undefined}
	/>
{/if}
