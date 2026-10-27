<script lang="ts">
	import type { GeoPoint } from '$lib/astro/solar';
	import { MAKKAH } from '$lib/astro/cities';
	import {
		PRAYER_KEYS,
		PRAYER_NAMES,
		type Basis,
		type PrayerKey,
		type PrayerLines
	} from '$lib/astro/prayer';
	import { project, type Rect } from '$lib/map/projection';
	import LineOverlay from './LineOverlay.svelte';

	interface Props {
		rect: Rect;
		width: number;
		height: number;
		lines: PrayerLines;
		/** Latitude of the subsolar point, to keep the Dhuhr label clear of the sun. */
		sunLat: number;
		labels: boolean;
		/** The pinned place, marked on the map. */
		place: GeoPoint | null;
		scale: number;
	}

	let { rect, width, height, lines, sunLat, labels, place, scale }: Props = $props();

	const r = (n: number) => n * scale;

	/** Solid where the sign occurs; dashed where a rule estimates it; dotted for the polar 45° rule. */
	const dash = (basis: Basis) =>
		basis === 'sun' ? undefined : basis === 'rule' ? `${r(7)} ${r(5)}` : `${r(0.5)} ${r(5)}`;

	const strokes = $derived(
		PRAYER_KEYS.flatMap((key) =>
			lines[key].map((seg) => ({
				points: seg.points,
				color: `var(--color-${key})`,
				dash: dash(seg.basis)
			}))
		)
	);

	// Labels sit where each line crosses a chosen latitude, staggered so the
	// close pairs (Fajr–Sunrise, Maghrib–Isha) don't collide. Dhuhr's goes in
	// the hemisphere away from the sun marker.
	const LABEL_LAT: Record<Exclude<PrayerKey, 'dhuhr'>, number> = {
		fajr: 14,
		sunrise: -14,
		asr: 26,
		maghrib: -14,
		isha: 14
	};

	function labelAt(key: PrayerKey) {
		const target = key === 'dhuhr' ? (sunLat > 0 ? -38 : 38) : LABEL_LAT[key];
		let best: GeoPoint | null = null;
		let bestScore = Infinity;
		for (const seg of lines[key]) {
			for (const p of seg.points) {
				// Prefer the observed segments over estimated ones.
				const score = Math.abs(p.lat - target) + (seg.basis === 'sun' ? 0 : 60);
				if (score < bestScore) {
					bestScore = score;
					best = p;
				}
			}
		}
		return best && { text: PRAYER_NAMES[key].name, color: `var(--color-${key})`, at: best };
	}

	const labelPts = $derived(
		labels ? PRAYER_KEYS.map(labelAt).filter((l) => l !== null) : []
	);

	const kaaba = $derived(project(MAKKAH.lat, MAKKAH.lon, rect));
</script>

<LineOverlay {rect} {width} {height} lines={strokes} labels={labelPts} {place} {scale}>
	<!-- The Kaaba, which every prayer faces. -->
	<g>
		<rect
			x={kaaba.x - r(3)}
			y={kaaba.y - r(3)}
			width={r(6)}
			height={r(6)}
			fill="#0b0b0c"
			stroke="var(--color-sun)"
			stroke-width={r(1)}
		/>
		{#if labels}
			<text
				x={kaaba.x + r(6)}
				y={kaaba.y + r(3.5)}
				font-size={r(10)}
				fill="var(--color-ink)"
				opacity="0.8"
				style={`paint-order: stroke; stroke: var(--color-space); stroke-width: ${r(2.5)}px;`}
			>
				{MAKKAH.name}
			</text>
		{/if}
	</g>
</LineOverlay>
