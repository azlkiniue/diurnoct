<script lang="ts">
	import { settings } from '$lib/stores/settings.svelte';
	import { sublunarPoint, moonPhase } from '$lib/astro/lunar';
	import { APP_NAME, APP_TAGLINE } from '$lib/config';
	import { getMapView } from '$lib/map/view';

	import MapOverlay from '$lib/components/MapOverlay.svelte';
	import Hud from '$lib/components/Hud.svelte';

	// The map, clock and controls live in the layout; this view adds the
	// day & night overlays.
	const view = getMapView();

	const st = $derived(settings.current);
	const moon = $derived(sublunarPoint(view.time));
	const phase = $derived(moonPhase(view.time));
</script>

<svelte:head>
	<title>{APP_NAME} — {APP_TAGLINE}</title>
</svelte:head>

{#if view.width > 0 && view.height > 0}
	<MapOverlay
		rect={view.rect}
		width={view.width}
		height={view.height}
		sun={view.sun.subsolar}
		{moon}
		declination={view.sun.declination}
		now={view.time}
		layers={st.layers}
		scale={st.ui.hudScale}
	/>
{/if}

{#if !view.uiHidden}
	<Hud
		layers={st.layers}
		time={view.time}
		sun={view.sun.subsolar}
		{moon}
		{phase}
		cursor={st.layers.coordinates ? view.cursor : null}
		scale={st.ui.hudScale}
		customTime={st.time.mode === 'custom'}
	/>
{/if}
