/**
 * Persistent, reactive settings store (Svelte 5 runes).
 *
 * `verbosity` drives a set of info-overlay toggles via presets; flipping any
 * individual layer switches verbosity to "custom". Everything is mirrored to
 * localStorage so a configured wallpaper survives reloads.
 */

import { browser } from '$app/environment';
import type { FitMode } from '$lib/map/projection';
import type { TextureSettings } from '$lib/config';
import type { TimeSettings } from '$lib/time';
import {
	HIGH_LAT_RULES,
	METHODS,
	type AsrSchool,
	type HighLatRule,
	type MethodId
} from '$lib/astro/prayer';

const STORAGE_KEY = 'diurnoct:settings:v1';

export type Verbosity = 'minimal' | 'standard' | 'detailed' | 'custom';

export type LayerKey =
	| 'title'
	| 'clock'
	| 'localClock'
	| 'cityClocks'
	| 'date'
	| 'subsolar'
	| 'sublunar'
	| 'terminatorLine'
	| 'graticule'
	| 'cities'
	| 'cityLabels'
	| 'coordinates'
	| 'legend';

export type Layers = Record<LayerKey, boolean>;

export interface MapSettings {
	fit: FitMode;
	nightBrightness: number;
	softTwilight: boolean;
	/** Twilight band half-width, in degrees of solar elevation. */
	twilightDegrees: number;
	/** Warm terminator glow, 0..1. */
	dusk: number;
	showStars: boolean;
}

export interface UISettings {
	autoHide: boolean;
	hudScale: number;
}

/** A place whose timetable the prayer view shows. */
export interface PrayerPlace {
	lat: number;
	lon: number;
	/** City name, "Your location", or empty for a point picked on the map. */
	name: string;
	/** IANA time zone, when known; otherwise times show in the viewer's. */
	tz?: string;
	/** Only approximately here: the city of the device's time zone. */
	approx?: boolean;
}

export interface PrayerSettings {
	/** Offer the prayer-times view (toolbar switch, P). Off until turned on in settings. */
	enabled: boolean;
	method: MethodId;
	asr: AsrSchool;
	highLat: HighLatRule;
	/** Prayer names along the lines. */
	labels: boolean;
	legend: boolean;
	/** The pinned place's timetable panel. */
	timetable: boolean;
	/** Unset until the viewer picks one — meanwhile, their time zone's city; null once cleared. */
	place?: PrayerPlace | null;
}

export interface Settings {
	verbosity: Verbosity;
	layers: Layers;
	map: MapSettings;
	time: TimeSettings;
	texture: TextureSettings;
	ui: UISettings;
	prayer: PrayerSettings;
}

export const LAYER_META: { key: LayerKey; label: string; hint: string }[] = [
	{ key: 'title', label: 'Title', hint: 'App name in the corner' },
	{ key: 'clock', label: 'UTC clock', hint: 'Coordinated Universal Time' },
	{ key: 'localClock', label: 'Local clock', hint: "Your device's timezone" },
	{ key: 'cityClocks', label: 'City clocks', hint: 'A strip of world-city times' },
	{ key: 'date', label: 'Date', hint: 'Current calendar date' },
	{ key: 'subsolar', label: 'Sun marker', hint: 'Point where the sun is overhead' },
	{ key: 'sublunar', label: 'Moon marker', hint: 'Sub-lunar point & phase' },
	{ key: 'terminatorLine', label: 'Terminator line', hint: 'Crisp day/night boundary' },
	{ key: 'graticule', label: 'Graticule', hint: 'Latitude / longitude grid' },
	{ key: 'cities', label: 'City dots', hint: 'Major cities, lit by day/night' },
	{ key: 'cityLabels', label: 'City labels', hint: 'Names beside the city dots' },
	{ key: 'coordinates', label: 'Cursor coordinates', hint: 'Lat/lon under the pointer' },
	{ key: 'legend', label: 'Legend', hint: 'What the colors mean' }
];

const ALL_OFF: Layers = {
	title: false,
	clock: false,
	localClock: false,
	cityClocks: false,
	date: false,
	subsolar: false,
	sublunar: false,
	terminatorLine: false,
	graticule: false,
	cities: false,
	cityLabels: false,
	coordinates: false,
	legend: false
};

export function presetLayers(preset: Exclude<Verbosity, 'custom'>): Layers {
	switch (preset) {
		case 'minimal':
			return { ...ALL_OFF, clock: true, date: true };
		case 'standard':
			return {
				...ALL_OFF,
				title: true,
				clock: true,
				localClock: true,
				date: true,
				subsolar: true,
				sublunar: true,
				terminatorLine: true,
				cities: true
			};
		case 'detailed':
			return {
				title: true,
				clock: true,
				localClock: true,
				cityClocks: true,
				date: true,
				subsolar: true,
				sublunar: true,
				terminatorLine: true,
				graticule: true,
				cities: true,
				cityLabels: true,
				coordinates: true,
				legend: true
			};
	}
}

function defaults(): Settings {
	return {
		verbosity: 'standard',
		layers: presetLayers('standard'),
		map: {
			fit: 'contain',
			nightBrightness: 1,
			softTwilight: true,
			twilightDegrees: 6,
			dusk: 0.5,
			showStars: true
		},
		time: { mode: 'live', customISO: '' },
		texture: { source: 'auto', customDay: '', customNight: '' },
		ui: { autoHide: true, hudScale: 1 },
		prayer: {
			enabled: false,
			method: 'mwl',
			asr: 'standard',
			highLat: 'mwl45',
			labels: true,
			legend: true,
			timetable: true
		}
	};
}

/** Deep-ish merge that keeps unknown/legacy keys from breaking the shape. */
function merge(base: Settings, saved: unknown): Settings {
	if (!saved || typeof saved !== 'object') return base;
	const s = saved as Record<string, unknown>;
	return {
		verbosity: (s.verbosity as Verbosity) ?? base.verbosity,
		layers: { ...base.layers, ...(s.layers as Partial<Layers>) },
		map: { ...base.map, ...(s.map as Partial<MapSettings>) },
		time: { ...base.time, ...(s.time as Partial<TimeSettings>) },
		texture: { ...base.texture, ...(s.texture as Partial<TextureSettings>) },
		ui: { ...base.ui, ...(s.ui as Partial<UISettings>) },
		prayer: mergePrayer(base.prayer, s.prayer)
	};
}

function mergePrayer(base: PrayerSettings, saved: unknown): PrayerSettings {
	const p = { ...base, ...(saved as Partial<PrayerSettings>) };
	// Drop ids a newer or older version doesn't know.
	if (!METHODS.some((m) => m.id === p.method)) p.method = base.method;
	if (!HIGH_LAT_RULES.some((r) => r.id === p.highLat)) p.highLat = base.highLat;
	return p;
}

function load(): Settings {
	const base = defaults();
	if (!browser) return base;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return base;
		return merge(base, JSON.parse(raw));
	} catch {
		return base;
	}
}

class SettingsStore {
	current = $state<Settings>(load());

	constructor() {
		if (browser) {
			$effect.root(() => {
				$effect(() => {
					const json = JSON.stringify(this.current);
					try {
						localStorage.setItem(STORAGE_KEY, json);
					} catch {
						/* storage full / disabled — ignore */
					}
				});
			});
		}
	}

	setPreset(preset: Exclude<Verbosity, 'custom'>) {
		this.current.verbosity = preset;
		this.current.layers = presetLayers(preset);
	}

	toggleLayer(key: LayerKey) {
		this.current.layers[key] = !this.current.layers[key];
		this.current.verbosity = 'custom';
	}

	setLayer(key: LayerKey, value: boolean) {
		this.current.layers[key] = value;
		this.current.verbosity = 'custom';
	}

	setMap<K extends keyof MapSettings>(key: K, value: MapSettings[K]) {
		this.current.map[key] = value;
	}

	setTime<K extends keyof TimeSettings>(key: K, value: TimeSettings[K]) {
		this.current.time[key] = value;
	}

	setTexture<K extends keyof TextureSettings>(key: K, value: TextureSettings[K]) {
		this.current.texture[key] = value;
	}

	setUI<K extends keyof UISettings>(key: K, value: UISettings[K]) {
		this.current.ui[key] = value;
	}

	setPrayer<K extends keyof PrayerSettings>(key: K, value: PrayerSettings[K]) {
		this.current.prayer[key] = value;
	}

	reset() {
		this.current = defaults();
	}
}

export const settings = new SettingsStore();
