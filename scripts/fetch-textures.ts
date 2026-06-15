/**
 * Download the day & night satellite textures into `static/textures/` so the
 * app can be fully self-hosted (no runtime CDN dependency).
 *
 * Usage:
 *   bun run fetch-textures
 *   DAY_URL=... NIGHT_URL=... bun run fetch-textures   # override sources
 *
 * The defaults are NASA-derived equirectangular images shipped with the
 * `three-globe` package and served by jsDelivr. Swap in higher-resolution
 * NASA "Blue Marble" / "Black Marble" images for a sharper wallpaper.
 */

import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

// Defaults: 4K day "Blue Marble" + 2K city-lights night (both CORS-safe on
// jsDelivr). Override with DAY_URL / NIGHT_URL for e.g. 8K NASA imagery.
const DAY_URL =
	process.env.DAY_URL ??
	'https://cdn.jsdelivr.net/gh/turban/webgl-earth@master/images/2_no_clouds_4k.jpg';
const NIGHT_URL =
	process.env.NIGHT_URL ??
	'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r168/examples/textures/planets/earth_lights_2048.png';

const targets = [
	{ name: 'day', url: DAY_URL, out: 'static/textures/day.jpg' },
	{ name: 'night', url: NIGHT_URL, out: 'static/textures/night.jpg' }
];

function human(bytes: number): string {
	const mb = bytes / (1024 * 1024);
	return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

let failures = 0;

for (const t of targets) {
	process.stdout.write(`↓ ${t.name}: ${t.url}\n`);
	try {
		const res = await fetch(t.url);
		if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
		const buf = new Uint8Array(await res.arrayBuffer());
		await mkdir(dirname(t.out), { recursive: true });
		await Bun.write(t.out, buf);
		process.stdout.write(`  ✓ saved ${t.out} (${human(buf.byteLength)})\n`);
	} catch (err) {
		failures++;
		process.stderr.write(`  ✗ failed: ${(err as Error).message}\n`);
	}
}

if (failures) {
	process.stderr.write(`\n${failures} texture(s) failed to download.\n`);
	process.exit(1);
}

process.stdout.write('\nDone. Set the texture source to "Auto" (default) to use them.\n');
