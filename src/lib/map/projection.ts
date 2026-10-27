/**
 * Equirectangular (plate carrée) projection helpers.
 *
 * The map texture is a 2:1 equirectangular image, so screen <-> geographic
 * conversion is purely linear. Both the WebGL renderer and the SVG overlays
 * use the SAME map rectangle so vectors line up exactly with the pixels.
 */

export type FitMode = 'contain' | 'cover';

export interface Rect {
	left: number;
	top: number;
	width: number;
	height: number;
}

const MAP_ASPECT = 2; // width / height for a full-earth equirectangular map

/**
 * The rectangle (in CSS pixels) that the 2:1 map occupies inside a viewport of
 * `w` x `h`, either letterboxed to fit ("contain") or cropped to fill ("cover").
 */
export function computeMapRect(w: number, h: number, fit: FitMode): Rect {
	const viewportAspect = w / h;
	let width: number;
	let height: number;

	const widthLimited =
		fit === 'cover' ? viewportAspect < MAP_ASPECT : viewportAspect > MAP_ASPECT;

	if (widthLimited) {
		height = h;
		width = h * MAP_ASPECT;
	} else {
		width = w;
		height = w / MAP_ASPECT;
	}

	return {
		left: (w - width) / 2,
		top: (h - height) / 2,
		width,
		height
	};
}

/** Geographic (lat/lon, degrees) -> screen pixel inside `rect`. */
export function project(lat: number, lon: number, rect: Rect): { x: number; y: number } {
	return {
		x: rect.left + ((lon + 180) / 360) * rect.width,
		y: rect.top + ((90 - lat) / 180) * rect.height
	};
}

/** SVG path data for a line through geographic points, inside `rect`. */
export function linePath(points: { lat: number; lon: number }[], rect: Rect): string {
	return points
		.map((p, i) => {
			const { x, y } = project(p.lat, p.lon, rect);
			return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
		})
		.join('');
}

/** Screen pixel -> geographic (lat/lon, degrees). */
export function unproject(x: number, y: number, rect: Rect): { lat: number; lon: number } {
	return {
		lon: ((x - rect.left) / rect.width) * 360 - 180,
		lat: 90 - ((y - rect.top) / rect.height) * 180
	};
}

/** Is a screen pixel inside the drawn map rectangle? */
export function insideRect(x: number, y: number, rect: Rect): boolean {
	return (
		x >= rect.left &&
		x <= rect.left + rect.width &&
		y >= rect.top &&
		y <= rect.top + rect.height
	);
}
