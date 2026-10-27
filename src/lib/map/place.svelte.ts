/**
 * Picking the pinned place, for any view that shows times for one. The views
 * read and write the same setting, so a place pinned in one shows in all.
 *
 * Until the viewer picks one it's the city of their time zone: approximate,
 * but it needs no permission. A click on the map pins the point — or a city
 * whose marker is within a few pixels, so its times can show in local time —
 * and *Use my location* pins the device's position. Nothing leaves the device.
 */

import { onMount } from 'svelte';
import { settings, type Place } from '$lib/stores/settings.svelte';
import type { City } from '$lib/astro/cities';
import type { GeoPoint } from '$lib/astro/solar';
import { zoneCity } from '$lib/astro/zones';
import { localTimeZone } from '$lib/time';
import { project } from './projection';
import { getMapView } from './view';

/** Why the browser gave no location (by GeolocationPositionError code), and what to do. */
const LOCATE_ERRORS: Record<number, string> = {
	1: 'Location is blocked for this page. Allow it in your browser’s site settings, or click your spot on the map.',
	2: 'Your device couldn’t find its location. Check that Location Services is on for this browser, or click your spot on the map.',
	3: 'Finding your location took too long. Try again, or click your spot on the map.'
};

const round = (n: number) => Math.round(n * 100) / 100;

export interface PlacePicker {
	/** The pinned place, or the time zone's city until one is pinned; null once cleared. */
	readonly place: Place | null;
	/** Waiting on the browser for the device's position. */
	readonly locating: boolean;
	/** Why *Use my location* failed, and what to do instead; empty when it didn't. */
	readonly locateError: string;
	/** Pin the device's position. */
	locate(): Promise<void>;
	/** Unpin, showing no place. */
	clear(): void;
}

/** Call while a view initialises: it reads the map view, and picks on map clicks while `active`. */
export function placePicker(options: {
	/** Whether a map click pins a place — while the view's place panel is showing. */
	active: () => boolean;
	/** City markers a click snaps to. */
	markers: () => City[];
}): PlacePicker {
	const view = getMapView();

	// Browser-only, so it's set once mounted.
	let zonePlace = $state<Place | null>(null);
	onMount(() => {
		const city = zoneCity(localTimeZone());
		if (city) {
			zonePlace = { lat: city.lat, lon: city.lon, name: city.name, tz: city.tz, approx: true };
		}
	});

	const place = $derived(settings.current.place === undefined ? zonePlace : settings.current.place);

	let locating = $state(false);
	let locateError = $state('');

	/** The place a click at `p` picks: the nearest marker within a few pixels, or else the point. */
	function placeAt(p: GeoPoint): Place {
		const at = project(p.lat, p.lon, view.rect);
		let snap = 12 * settings.current.ui.hudScale;
		let city: City | null = null;
		for (const c of options.markers()) {
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
		if (!options.active()) return;
		return view.onMapClick((p) => {
			locateError = '';
			settings.setPlace(placeAt(p));
		});
	});

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
				settings.setPlace({
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
		if (settings.current.place === null) settings.setPlace(undefined);
	}

	return {
		get place() {
			return place;
		},
		get locating() {
			return locating;
		},
		get locateError() {
			return locateError;
		},
		locate,
		clear() {
			locateError = '';
			settings.setPlace(null);
		}
	};
}
