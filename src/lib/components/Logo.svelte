<script lang="ts">
	// The diurnoct mark — the same split day/night globe used as the favicon.
	let { size = 20, class: className = '' }: { size?: number; class?: string } = $props();

	// Unique, SSR-stable id so multiple logos on one page don't share a clipPath.
	const uid = $props.id();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 32 32"
	fill="none"
	class={className}
	aria-hidden="true"
>
	<defs>
		<clipPath id={`dn-${uid}`}>
			<circle cx="16" cy="16" r="14" />
		</clipPath>
	</defs>
	<circle cx="16" cy="16" r="15" fill="#0a1020" />
	<g clip-path={`url(#dn-${uid})`}>
		<rect x="2" y="2" width="14" height="28" fill="#12243f" />
		<rect x="16" y="2" width="14" height="28" fill="#3b6fd6" />
		<path d="M16 2 a14 14 0 0 1 0 28 a8 14 0 0 0 0 -28" fill="#7fb2ff" opacity="0.55" />
		<circle cx="8" cy="11" r="0.9" fill="#ffd27f" />
		<circle cx="11" cy="20" r="0.9" fill="#ffd27f" />
		<circle cx="6" cy="17" r="0.7" fill="#ffce6e" />
	</g>
	<circle cx="16" cy="16" r="15" fill="none" stroke="#1b2740" stroke-width="1.5" />
</svg>
