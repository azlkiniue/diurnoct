<script lang="ts">
	import { settings } from '$lib/stores/settings.svelte';
	import { sublunarPoint, moonPhase } from '$lib/astro/lunar';
	import { CITIES, MAKKAH } from '$lib/astro/cities';
	import {
		currentAndNext,
		methodById,
		prayerLines,
		prayerTimeline,
		type PrayerConfig
	} from '$lib/astro/prayer';
	import { solarDay } from '$lib/astro/solar';
	import { APP_NAME } from '$lib/config';
	import { getMapView } from '$lib/map/view';
	import { placePicker } from '$lib/map/place.svelte';
	import { viewById, viewLayers } from '$lib/views';

	import MapOverlay from '$lib/components/MapOverlay.svelte';
	import PrayerOverlay from '$lib/components/PrayerOverlay.svelte';
	import PrayerLegend from '$lib/components/PrayerLegend.svelte';
	import PrayerTimetable from '$lib/components/PrayerTimetable.svelte';
	import Hud from '$lib/components/Hud.svelte';

	// The map, clock and controls live in the layout; this view adds the lines
	// where each prayer is beginning right now, and a timetable for one place.
	const view = getMapView();

	const st = $derived(settings.current);
	const prayer = $derived(st.prayer);
	const cfg = $derived<PrayerConfig>({
		method: prayer.method,
		asr: prayer.asr,
		highLat: prayer.highLat
	});
	const method = $derived(methodById(prayer.method));

	const lines = $derived(prayerLines(view.time, cfg));

	// Clicks snap to the Kaaba marker, and to the city dots when they're shown.
	const picker = placePicker({
		active: () => prayer.timetable,
		markers: () => (st.layers.cities ? [MAKKAH, ...CITIES] : [MAKKAH])
	});

	// Recomputed once per solar day at the place, not every tick.
	const place = $derived(prayer.timetable ? picker.place : null);
	const day = $derived(place ? solarDay(place.lon, view.time) : 0);
	const timeline = $derived(place ? prayerTimeline(place, day, cfg) : null);
	const status = $derived(timeline ? currentAndNext(timeline.events, view.time) : null);

	const layers = $derived(viewLayers(viewById('prayer'), st.layers));
	const moon = $derived(sublunarPoint(view.time));
	const phase = $derived(moonPhase(view.time));
</script>

<svelte:head>
	<title>{APP_NAME} — prayer times map</title>
	<meta
		name="description"
		content="A live world map of where each of the five daily prayers is beginning right now, with high-latitude rules from Islamic jurisprudence."
	/>
</svelte:head>

{#snippet legend()}
	<!-- On phones the timetable's colour bars and the line labels already key the colours. -->
	<div class={prayer.timetable ? 'hidden sm:block' : ''}>
		<PrayerLegend {method} asr={prayer.asr} estimating={prayer.highLat !== 'none'} />
	</div>
{/snippet}

{#snippet timetable()}
	<PrayerTimetable
		{place}
		{timeline}
		current={status?.current ?? null}
		next={status?.next ?? null}
		now={view.time}
		locating={picker.locating}
		locateError={picker.locateError}
		onlocate={picker.locate}
		onclear={picker.clear}
	/>
{/snippet}

{#if view.width > 0 && view.height > 0}
	<PrayerOverlay
		rect={view.rect}
		width={view.width}
		height={view.height}
		{lines}
		sunLat={view.sun.subsolar.lat}
		labels={prayer.labels}
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
		tagline={`prayer times · ${method.name}`}
		legend={prayer.legend ? legend : undefined}
		aside={prayer.timetable ? timetable : undefined}
	/>
{/if}
