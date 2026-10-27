<script lang="ts">
	import { wrapLon, type GeoPoint } from '$lib/astro/solar';
	import {
		MOON_EVENT_KINDS,
		MOON_EVENT_NAMES,
		type MoonEventKind,
		type MoonLines
	} from '$lib/astro/moon';
	import { project, type Rect } from '$lib/map/projection';

	interface Props {
		rect: Rect;
		width: number;
		height: number;
		lines: MoonLines;
		/** Latitude of the point under the moon, to keep the transit label clear of its marker. */
		moonLat: number;
		labels: boolean;
		/** The pinned place, marked on the map. */
		place: GeoPoint | null;
		scale: number;
	}

	let { rect, width, height, lines, moonLat, labels, place, scale }: Props = $props();

	const uid = $props.id();
	const r = (n: number) => n * scale;

	// Longitudes are unwrapped, so paths run off the map's edges; the markup draws
	// each one again a world to the left and right, clipped to the map.
	const path = (points: GeoPoint[]) =>
		points
			.map((p, i) => {
				const { x, y } = project(p.lat, p.lon, rect);
				return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
			})
			.join('');

	const paths = $derived(
		MOON_EVENT_KINDS.flatMap((kind) => lines[kind].map((line) => ({ kind, d: path(line) })))
	);
	const moonlit = $derived(lines.moonlit.map((ring) => `${path(ring)}Z`));
	// Faint near new moon, clearest at full.
	const moonlitOpacity = $derived(0.22 * lines.illumination);

	// Labels sit where each line crosses a chosen latitude; the transit line's
	// goes in the hemisphere away from the moon marker.
	function labelAt(kind: MoonEventKind) {
		const target = kind === 'transit' ? (moonLat > 0 ? -38 : 38) : 8;
		let best: GeoPoint | null = null;
		for (const line of lines[kind]) {
			for (const p of line) {
				if (!best || Math.abs(p.lat - target) < Math.abs(best.lat - target)) best = p;
			}
		}
		if (!best) return null;
		const at = project(best.lat, wrapLon(best.lon), rect);
		// Flip to the line's left when the label would run off the map.
		const flip = at.x + r(80) > rect.left + rect.width;
		return { kind, x: at.x + (flip ? -r(6) : r(6)), y: at.y - r(4), flip };
	}

	const labelPts = $derived(
		labels ? MOON_EVENT_KINDS.map(labelAt).filter((l) => l !== null) : []
	);

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
				<!-- The moonlit night: the moon up and the sun down. -->
				{#each moonlit as d, i (i)}
					<path {d} fill="var(--color-moon)" fill-opacity={moonlitOpacity} />
				{/each}
				<!-- A dark casing keeps every line legible over bright desert and ice. -->
				{#each paths as p, i (i)}
					<path d={p.d} stroke="rgb(3 6 14 / 0.6)" stroke-width={r(4.5)} />
				{/each}
				{#each paths as p, i (i)}
					<path d={p.d} stroke={`var(--color-${p.kind})`} stroke-width={r(2)} />
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
			{#each labelPts as l (l.kind)}
				<text x={l.x} y={l.y} fill={`var(--color-${l.kind})`} text-anchor={l.flip ? 'end' : 'start'}>
					{MOON_EVENT_NAMES[l.kind]}
				</text>
			{/each}
		</g>
	{/if}

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
