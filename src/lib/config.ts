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
export const REMOTE_DAY =
	'https://cdn.jsdelivr.net/npm/three-globe@2/example/img/earth-blue-marble.jpg';
export const REMOTE_NIGHT =
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

export function resolveSources(base: string, t: TextureSettings): ResolvedSources {
	const local = (p: string) => `${base}${p}`;
	switch (t.source) {
		case 'remote':
			return { day: [REMOTE_DAY], night: [REMOTE_NIGHT] };
		case 'custom':
			return {
				day: [t.customDay, REMOTE_DAY].filter(Boolean),
				night: [t.customNight, REMOTE_NIGHT].filter(Boolean)
			};
		case 'auto':
		default:
			// Prefer a locally-hosted copy, fall back to the CDN.
			return {
				day: [local(LOCAL_DAY), REMOTE_DAY],
				night: [local(LOCAL_NIGHT), REMOTE_NIGHT]
			};
	}
}
