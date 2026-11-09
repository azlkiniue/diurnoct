/**
 * Check the line colours in the theme (src/app.css) against the rules their
 * comments state, so lines a viewer sees together stay apart under colour
 * blindness:
 *
 *   1. Prayer lines: each against its neighbour in the order they sweep round
 *      the globe, which is the order of a place's day, so Isha–Fajr across the
 *      night as well. At least 17 apart under protan and deutan simulation.
 *   2. Moon lines: every pair, and each against the terminator line's dusk
 *      orange, which the Moon view draws beside them whenever its layer is on.
 *      At least 17 apart under protan, deutan and tritan simulation.
 *
 * The distance is OKLab ΔE × 100 between two colours as a colour-blind viewer
 * sees them: the Machado, Oliveira & Fernandes (2009) matrices at severity 1,
 * applied in linear sRGB and clamped to the gamut. The colours are read from
 * the theme's tokens, the one place they're declared, under the names the
 * overlays draw them with: var(--color-<prayer>), var(--color-<event>) and
 * var(--color-dusk).
 *
 * Usage:  bun run verify-palette
 */

import { MOON_EVENT_KINDS, MOON_EVENT_NAMES } from '../src/lib/astro/moon';
import { PRAYER_KEYS, PRAYER_NAMES } from '../src/lib/astro/prayer';

/** How far apart two lines a viewer sees together must be, OKLab ΔE × 100. */
const LIMIT = 17;

type Vec3 = [number, number, number];
type Simulation = 'protan' | 'deutan' | 'tritan';

function stop(message: string): never {
	process.stdout.write(`✗ ${message}\n`);
	process.exit(1);
}

// ---- the theme ------------------------------------------------------------------

const THEME = 'src/app.css';

/** Every --color-* token declared in the theme's @theme blocks, by name, leaving out comments. */
const tokens = new Map<string, string>();
const css = (await Bun.file(new URL(`../${THEME}`, import.meta.url)).text()).replace(/\/\*[\s\S]*?\*\//g, '');
for (const [, block] of css.matchAll(/@theme\b[^{]*\{([^}]*)\}/g)) {
	for (const [, name, value] of block.matchAll(/--color-([\w-]+)\s*:\s*([^;]+)/g)) tokens.set(name, value.trim());
}

interface Line {
	name: string;
	/** The theme token it's drawn in, --color-<token>. */
	token: string;
	/** Its colour there, as #rrggbb. */
	hex: string;
}

/** Two lines a viewer sees together, checked against each other. */
type Pair = [Line, Line];

function line(name: string, token: string): Line {
	const value = tokens.get(token);
	if (value === undefined) stop(`${name}: no --color-${token} in the theme (${THEME})`);
	if (!/^#[0-9a-f]{6}$/i.test(value)) stop(`${name}: --color-${token} is ${value}; give line colours as #rrggbb`);
	return { name, token, hex: value.toLowerCase() };
}

// ---- the measure ----------------------------------------------------------------

/**
 * Machado, Oliveira & Fernandes (2009), "A Physiologically-based Model for
 * Simulation of Color Vision Deficiency": protanopia, deuteranopia and
 * tritanopia, severity 1, on linear RGB.
 */
const MACHADO: Record<Simulation, [Vec3, Vec3, Vec3]> = {
	protan: [
		[0.152286, 1.052583, -0.204868],
		[0.114503, 0.786281, 0.099216],
		[-0.003882, -0.048116, 1.051998]
	],
	deutan: [
		[0.367322, 0.860646, -0.227968],
		[0.280085, 0.672501, 0.047413],
		[-0.01182, 0.04294, 0.968881]
	],
	tritan: [
		[1.255528, -0.076749, -0.178779],
		[-0.078411, 0.930809, 0.147602],
		[0.004733, 0.691367, 0.3039]
	]
};

/** #rrggbb as linear-light sRGB. */
function linearRgb(hex: string): Vec3 {
	return [1, 3, 5].map((i) => {
		const c = parseInt(hex.slice(i, i + 2), 16) / 255;
		return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	}) as Vec3;
}

/** Linear sRGB as OKLab (Björn Ottosson, 2020). */
function oklab([r, g, b]: Vec3): Vec3 {
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
	];
}

/** A colour as a viewer with `sim` sees it, in OKLab: simulated in linear sRGB, then clamped to the gamut. */
function seen(hex: string, sim: Simulation): Vec3 {
	const rgb = linearRgb(hex);
	const clamp = (x: number) => Math.min(1, Math.max(0, x));
	return oklab(MACHADO[sim].map(([r, g, b]) => clamp(r * rgb[0] + g * rgb[1] + b * rgb[2])) as Vec3);
}

/** How far apart two colours look to a viewer with `sim`, OKLab ΔE × 100. */
function distance(a: string, b: string, sim: Simulation): number {
	const [p, q] = [seen(a, sim), seen(b, sim)];
	return 100 * Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

// ---- the rules ------------------------------------------------------------------

const prayer = PRAYER_KEYS.map((key) => line(PRAYER_NAMES[key].name, key));
const moon = MOON_EVENT_KINDS.map((kind) => line(MOON_EVENT_NAMES[kind], kind));
const terminator = line('Terminator line', 'dusk');

const RULES: { name: string; sims: Simulation[]; pairs: Pair[] }[] = [
	{
		name: 'Prayer lines, each against the next as they sweep round the globe, Isha–Fajr across the night',
		sims: ['protan', 'deutan'],
		pairs: prayer.map((a, i) => [a, prayer[(i + 1) % prayer.length]])
	},
	{
		name: "Moon lines, every pair and each against the terminator line's orange",
		sims: ['protan', 'deutan', 'tritan'],
		pairs: [
			...moon.flatMap((a, i) => moon.slice(i + 1).map((b): Pair => [a, b])),
			...moon.map((a): Pair => [a, terminator])
		]
	}
];

// ---- report ---------------------------------------------------------------------

const listed = new Intl.ListFormat('en-GB');
const label = ([a, b]: Pair) => `${a.name} ${a.hex} – ${b.name} ${b.hex}`;
const width = Math.max(...RULES.flatMap((rule) => rule.pairs.map((pair) => label(pair).length)));

let checked = 0;
const tooClose: string[] = [];
for (const rule of RULES) {
	process.stdout.write(`${rule.name}: at least ${LIMIT} apart under ${listed.format(rule.sims)} simulation\n`);
	for (const pair of rule.pairs) {
		const [a, b] = pair;
		const distances = rule.sims.map((sim) => ({ sim, d: distance(a.hex, b.hex, sim) }));
		const short = distances.filter(({ d }) => d < LIMIT);
		checked++;
		process.stdout.write(
			`  ${short.length ? '✗' : '✓'} ${label(pair).padEnd(width)}  ` +
				`${distances.map(({ sim, d }) => `${sim} ${d.toFixed(1).padStart(4)}`).join('  ')}\n`
		);
		if (short.length) {
			tooClose.push(
				`${a.name} (--color-${a.token}) – ${b.name} (--color-${b.token}): ` +
					short.map(({ sim, d }) => `${sim} ${d.toFixed(1)}`).join(', ')
			);
		}
	}
}

if (tooClose.length) {
	process.stdout.write(`\n✗ ${tooClose.length} of ${checked} pairs closer than ${LIMIT}:\n`);
	for (const s of tooClose) process.stdout.write(`    ${s}\n`);
} else {
	process.stdout.write(`\n✓ All ${checked} pairs at least ${LIMIT} apart\n`);
}
process.exit(tooClose.length ? 1 : 0);
