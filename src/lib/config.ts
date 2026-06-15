/** App-wide constants & texture source resolution. */

export const APP_NAME = 'diurnoct';
export const APP_TAGLINE = 'diurnal + nocturnal, yet another geochron-alike app';
export const REPO_URL = 'https://github.com/azlkiniue/diurnoct';

/**
 * Default satellite textures.
 *
 * These ship with the `three-globe` npm package and are served with permissive
 * CORS by jsDelivr, so they work out-of-the-box on a fresh deploy. Run
 * `bun run fetch-textures` to download local copies into `static/textures/` for
 * a fully self-hosted, offline-capable build.
 */
// High-resolution, CORS-enabled equirectangular textures (served by jsDelivr).
// Day: 4K NASA "Blue Marble". Night: 2K city lights.
export const REMOTE_DAY =
	'https://cdn.jsdelivr.net/gh/turban/webgl-earth@master/images/2_no_clouds_4k.jpg';
export const REMOTE_NIGHT =
	'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r168/examples/textures/planets/earth_lights_2048.png';

// Smaller, equally CORS-safe fallbacks used if a high-res file is unreachable.
export const REMOTE_DAY_FALLBACK =
	'https://cdn.jsdelivr.net/npm/three-globe@2/example/img/earth-blue-marble.jpg';
export const REMOTE_NIGHT_FALLBACK =
	'https://cdn.jsdelivr.net/npm/three-globe@2/example/img/earth-night.jpg';

export const LOCAL_DAY = '/textures/day.jpg';
export const LOCAL_NIGHT = '/textures/night.jpg';

export interface TextureSettings {
	source: 'auto' | 'remote' | 'custom';
	customDay: string;
	customNight: string;
}

export interface ResolvedSources {
	day: string[];
	night: string[];
}

/**
 * Build the ordered candidate URLs the renderer should try.
 * `base` is SvelteKit's base path (so local assets resolve under GitHub Pages).
 */
const REMOTE_DAYS = [REMOTE_DAY, REMOTE_DAY_FALLBACK];
const REMOTE_NIGHTS = [REMOTE_NIGHT, REMOTE_NIGHT_FALLBACK];

export function resolveSources(base: string, t: TextureSettings): ResolvedSources {
	const local = (p: string) => `${base}${p}`;
	switch (t.source) {
		case 'remote':
			return { day: [...REMOTE_DAYS], night: [...REMOTE_NIGHTS] };
		case 'custom':
			return {
				day: [t.customDay, ...REMOTE_DAYS].filter(Boolean),
				night: [t.customNight, ...REMOTE_NIGHTS].filter(Boolean)
			};
		case 'auto':
		default:
			// Prefer a locally-hosted copy, fall back to the CDN chain.
			return {
				day: [local(LOCAL_DAY), ...REMOTE_DAYS],
				night: [local(LOCAL_NIGHT), ...REMOTE_NIGHTS]
			};
	}
}
