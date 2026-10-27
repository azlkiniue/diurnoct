<script lang="ts">
	import { MOON_EVENT_KINDS, type MoonLines } from '$lib/astro/moon';
	import { project, type Rect } from '$lib/map/projection';

	interface Props {
		rect: Rect;
		width: number;
		height: number;
		lines: MoonLines;
		scale: number;
	}

	let { rect, width, height, lines, scale }: Props = $props();

	const uid = $props.id();
	const r = (n: number) => n * scale;

	// Longitudes are unwrapped, so paths run off the map's edges; the markup draws
	// each one again a world to the left and right, clipped to the map.
	const paths = $derived(
		MOON_EVENT_KINDS.flatMap((kind) =>
			lines[kind].map((line) => ({
				kind,
				d: line
					.map((p, i) => {
						const { x, y } = project(p.lat, p.lon, rect);
						return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
					})
					.join('')
			}))
		)
	);
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
					<path d={p.d} stroke="rgb(3 6 14 / 0.6)" stroke-width={r(4.5)} />
				{/each}
				{#each paths as p, i (i)}
					<path d={p.d} stroke={`var(--color-${p.kind})`} stroke-width={r(2)} />
				{/each}
			</g>
		{/each}
	</g>
</svg>
