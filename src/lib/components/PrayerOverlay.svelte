<script lang="ts">
	import { wrapLon, type GeoPoint } from '$lib/astro/solar';
	import { MAKKAH } from '$lib/astro/cities';
	import {
		PRAYER_KEYS,
		PRAYER_NAMES,
		type Basis,
		type PrayerKey,
		type PrayerLines
	} from '$lib/astro/prayer';
	import { project, type Rect } from '$lib/map/projection';

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

	const uid = $props.id();
	const r = (n: number) => n * scale;

	/** Solid where the sign occurs; dashed where a rule estimates it; dotted for the polar 45° rule. */
	const dash = (basis: Basis) =>
		basis === 'sun' ? undefined : basis === 'rule' ? `${r(7)} ${r(5)}` : `${r(0.5)} ${r(5)}`;

	// Longitudes are unwrapped, so paths run off the map's edges; the markup draws
	// each one again a world to the left and right, clipped to the map.
	const paths = $derived(
		PRAYER_KEYS.flatMap((key) =>
			lines[key].map((seg) => ({
				key,
				basis: seg.basis,
				d: seg.points
					.map((p, i) => {
						const { x, y } = project(p.lat, p.lon, rect);
						return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
					})
					.join('')
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
		if (!best) return null;
		const at = project(best.lat, wrapLon(best.lon), rect);
		// Flip to the line's left when the label would run off the map.
		const flip = at.x + r(64) > rect.left + rect.width;
		return { key, x: at.x + (flip ? -r(6) : r(6)), y: at.y - r(4), flip };
	}

	const labelPts = $derived(
		labels ? PRAYER_KEYS.map(labelAt).filter((l) => l !== null) : []
	);

	const kaaba = $derived(project(MAKKAH.lat, MAKKAH.lon, rect));
	const pin = $derived(place ? project(place.lat, place.lon, rect) : null);
</script>

<svg
	class="pointer-events-none absolute inset-0"
	{width}
	{height}
	viewBox={`0 0 ${width} ${height}`}
	fill="none"
>
	<defs>
		<clipPath id={`map-${uid}`}>
			<rect x={rect.left} y={rect.top} width={rect.width} height={rect.height} />
		</clipPath>
	</defs>

	<g clip-path={`url(#map-${uid})`} stroke-linecap="round" stroke-linejoin="round">
		{#each [-1, 0, 1] as shift (shift)}
			<g transform={`translate(${shift * rect.width} 0)`}>
				<!-- A dark casing keeps every line legible over bright desert and ice. -->
				{#each paths as p, i (i)}
					<path
						d={p.d}
						stroke="rgb(3 6 14 / 0.6)"
						stroke-width={r(4.5)}
						stroke-dasharray={dash(p.basis)}
					/>
				{/each}
				{#each paths as p, i (i)}
					<path
						d={p.d}
						stroke={`var(--color-${p.key})`}
						stroke-width={r(2)}
						stroke-dasharray={dash(p.basis)}
					/>
				{/each}
			</g>
		{/each}
	</g>

	{#if labels}
		<g
			font-size={r(11)}
			font-weight="600"
			style={`paint-order: stroke; stroke: var(--color-space); stroke-width: ${r(3)}px; stroke-linejoin: round;`}
		>
			{#each labelPts as l (l.key)}
				<text x={l.x} y={l.y} fill={`var(--color-${l.key})`} text-anchor={l.flip ? 'end' : 'start'}>
					{PRAYER_NAMES[l.key].name}
				</text>
			{/each}
		</g>
	{/if}

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

	{#if pin}
		<g>
			<circle cx={pin.x} cy={pin.y} r={r(9)} fill="var(--color-ink)" opacity="0.15" />
			<circle
				cx={pin.x}
				cy={pin.y}
				r={r(4)}
				fill="var(--color-ink)"
				stroke="var(--color-space)"
				stroke-width={r(1.5)}
			/>
		</g>
	{/if}
</svg>
