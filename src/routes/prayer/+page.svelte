<script lang="ts">
	import { onMount } from 'svelte';
	import { settings, type PrayerPlace } from '$lib/stores/settings.svelte';
	import { sublunarPoint, moonPhase } from '$lib/astro/lunar';
	import { CITIES, MAKKAH } from '$lib/astro/cities';
	import { zoneCity } from '$lib/astro/zones';
	import type { GeoPoint } from '$lib/astro/solar';
	import {
		currentAndNext,
		methodById,
		prayerLines,
		prayerTimeline,
		solarDay,
		type PrayerConfig
	} from '$lib/astro/prayer';
	import { APP_NAME } from '$lib/config';
	import { localTimeZone } from '$lib/time';
	import { project } from '$lib/map/projection';
	import { getMapView } from '$lib/map/view';

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

	// Until the viewer picks a place, the timetable follows their time zone's
	// city: approximate, but it needs no permission. Browser-only, so it's set
	// once mounted.
	let zonePlace = $state<PrayerPlace | null>(null);
	onMount(() => {
		const city = zoneCity(localTimeZone());
		if (city) {
			zonePlace = { lat: city.lat, lon: city.lon, name: city.name, tz: city.tz, approx: true };
		}
	});

	// Recomputed once per solar day at the place, not every tick.
	const chosen = $derived(prayer.place === undefined ? zonePlace : prayer.place);
	const place = $derived(prayer.timetable ? chosen : null);
	const day = $derived(place ? solarDay(place.lon, view.time) : 0);
	const timeline = $derived(place ? prayerTimeline(place, day, cfg) : null);
	const status = $derived(timeline ? currentAndNext(timeline.events, view.time) : null);

	// The prayer lines stand in for the terminator, and bring their own legend.
	const layers = $derived({ ...st.layers, terminatorLine: false, legend: false });
	const moon = $derived(sublunarPoint(view.time));
	const phase = $derived(moonPhase(view.time));

	const round = (n: number) => Math.round(n * 100) / 100;

	/**
	 * The place a map click picks: a city whose dot (or the Kaaba marker) is
	 * within a few pixels — so its timetable can show local time — or else the
	 * point itself.
	 */
	function placeAt(p: GeoPoint): PrayerPlace {
		const at = project(p.lat, p.lon, view.rect);
		let snap = 12 * st.ui.hudScale;
		let city = null;
		for (const c of st.layers.cities ? [MAKKAH, ...CITIES] : [MAKKAH]) {
			const q = project(c.lat, c.lon, view.rect);
			const d = Math.hypot(q.x - at.x, q.y - at.y);
			if (d <= snap) {
				snap = d;
				city = c;
			}
		}
		return city
			? { lat: city.lat, lon: city.lon, name: city.name, tz: city.tz }
			: { lat: round(p.lat), lon: round(p.lon), name: '' };
	}

	$effect(() => {
		if (!prayer.timetable) return;
		return view.onMapClick((p) => {
			locateError = '';
			settings.setPrayer('place', placeAt(p));
		});
	});

	let locating = $state(false);
	let locateError = $state('');

	/** Why the browser gave no location (by GeolocationPositionError code), and what to do. */
	const LOCATE_ERRORS: Record<number, string> = {
		1: 'Location is blocked for this page. Allow it in your browser’s site settings, or click your spot on the map.',
		2: 'Your device couldn’t find its location. Check that Location Services is on for this browser, or click your spot on the map.',
		3: 'Finding your location took too long. Try again, or click your spot on the map.'
	};

	async function locate() {
		locateError = '';
		if (!('geolocation' in navigator)) {
			fail('This browser can’t share its location. Click your spot on the map instead.');
			return;
		}
		// Where the answer is already no, asking again would only fail at once.
		const permission = await navigator.permissions
			?.query({ name: 'geolocation' })
			.then((p) => p.state)
			.catch(() => undefined);
		if (permission === 'denied') {
			fail(LOCATE_ERRORS[1]);
			return;
		}

		locating = true;
		// The timeout below only runs once access is granted, so an unanswered
		// permission prompt would otherwise leave us locating forever. A late
		// answer still lands.
		const watchdog = setTimeout(
			() => fail('Still waiting for permission — answer your browser’s prompt, or click your spot on the map.'),
			20_000
		);
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				clearTimeout(watchdog);
				locating = false;
				locateError = '';
				settings.setPrayer('place', {
					lat: round(pos.coords.latitude),
					lon: round(pos.coords.longitude),
					name: 'Your location',
					tz: localTimeZone()
				});
			},
			(err) => {
				clearTimeout(watchdog);
				fail(LOCATE_ERRORS[err.code] ?? LOCATE_ERRORS[2]);
			},
			{ maximumAge: 600_000, timeout: 15_000 }
		);
	}

	/** Say why, and with nothing pinned, fall back to the time-zone city. */
	function fail(message: string) {
		locating = false;
		locateError = message;
		if (prayer.place === null) settings.setPrayer('place', undefined);
	}
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
		{locating}
		{locateError}
		onlocate={locate}
		onclear={() => {
			locateError = '';
			settings.setPrayer('place', null);
		}}
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
