/**
 * The shared map view. The root layout owns the satellite canvas, the clock
 * and the controls, so switching between the day & night and prayer-time
 * views keeps the map (and its loaded textures) alive; each page reads this
 * context to draw its own overlays on top.
 */

import { createContext } from 'svelte';
import type { GeoPoint, SunState } from '$lib/astro/solar';
import type { Rect } from './projection';

export interface MapView {
	readonly width: number;
	readonly height: number;
	/** Where the 2:1 map sits in the viewport. */
	readonly rect: Rect;
	/** The instant being shown — live, or the custom time from settings. */
	readonly time: Date;
	readonly sun: SunState;
	/** Geographic point under the pointer, while the coordinates layer is on. */
	readonly cursor: GeoPoint | null;
	/** HUD panels hidden (H). */
	readonly uiHidden: boolean;
	/** Handle clicks on the map itself; returns a function that stops handling them. */
	onMapClick(handler: (point: GeoPoint) => void): () => void;
}

export const [getMapView, setMapView] = createContext<MapView>();
