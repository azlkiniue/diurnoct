<script lang="ts">
	import { settings } from '$lib/stores/settings.svelte';
	import { sublunarPoint, moonPhase } from '$lib/astro/lunar';
	import { moonLines } from '$lib/astro/moon';
	import { APP_NAME } from '$lib/config';
	import { getMapView } from '$lib/map/view';
	import { viewById, viewLayers } from '$lib/views';

	import MapOverlay from '$lib/components/MapOverlay.svelte';
	import MoonOverlay from '$lib/components/MoonOverlay.svelte';
	import Hud from '$lib/components/Hud.svelte';

	// The map, clock and controls live in the layout; this view adds the lines
	// where the moon is rising, highest and setting right now.
	const view = getMapView();

	const st = $derived(settings.current);
	const lines = $derived(moonLines(view.time));

	const layers = $derived(viewLayers(viewById('moon'), st.layers));
	const moon = $derived(sublunarPoint(view.time));
	const phase = $derived(moonPhase(view.time));
</script>

<svelte:head>
	<title>{APP_NAME} — moonrise & moonset map</title>
	<meta
		name="description"
		content="A live world map of where the moon is rising, highest in the sky and setting right now."
	/>
</svelte:head>

{#if view.width > 0 && view.height > 0}
	<MoonOverlay
		rect={view.rect}
		width={view.width}
		height={view.height}
		{lines}
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
	/>
{/if}
