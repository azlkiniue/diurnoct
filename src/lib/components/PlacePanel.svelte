<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { PlacePicker } from '$lib/map/place.svelte';
	import { formatLatLon } from '$lib/time';

	interface Props {
		/** What the panel lists, for its prompt while no place is pinned, e.g. "Prayer times". */
		subject: string;
		picker: PlacePicker;
		/** The panel's body, under the pinned place's name. */
		children: Snippet;
		/** Below the body, whether a place is pinned or not. */
		footer?: Snippet;
	}

	let { subject, picker, children, footer }: Props = $props();

	const place = $derived(picker.place);
</script>

{#snippet locateIcon(size: number)}
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
		<circle cx="12" cy="12" r="7" />
		<circle cx="12" cy="12" r="2" fill="currentColor" />
		<path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
	</svg>
{/snippet}

<div class="panel w-60 rounded-xl px-3 py-2.5 text-xs">
	{#if place}
		<div class="flex items-start justify-between gap-2">
			<div class="min-w-0">
				<div class="truncate text-sm font-medium text-[var(--color-ink)]">
					{place.name || 'Pinned place'}
				</div>
				<div class="tnum text-[11px] text-[var(--color-ink-dim)]">
					{place.approx ? 'from your time zone' : formatLatLon(place, 2)}
				</div>
			</div>
			<div class="flex shrink-0 gap-0.5">
				<button
					type="button"
					class="ic"
					aria-label="Use my location"
					title="Use my location"
					disabled={picker.locating}
					onclick={picker.locate}
				>
					{@render locateIcon(14)}
				</button>
				<button type="button" class="ic" aria-label="Remove place" title="Remove place" onclick={picker.clear}>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
						<path d="M18 6 6 18M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>

		{@render children()}
	{:else}
		<div class="text-sm font-medium text-[var(--color-ink)]">{subject} for a place</div>
		<p class="mt-1 text-[var(--color-ink-dim)]">Click anywhere on the map, or</p>
		<button
			type="button"
			class="mt-2 flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-[var(--color-ink)] transition hover:bg-white/10 disabled:opacity-50"
			disabled={picker.locating}
			onclick={picker.locate}
		>
			{@render locateIcon(13)}
			{picker.locating ? 'Locating…' : 'Use my location'}
		</button>
	{/if}

	{@render footer?.()}

	{#if picker.locateError}
		<p class="mt-2 text-[11px] text-[var(--color-dusk)]">{picker.locateError}</p>
	{/if}
</div>

<style>
	.ic {
		display: grid;
		place-items: center;
		width: 1.6rem;
		height: 1.6rem;
		border-radius: 0.5rem;
		color: var(--color-ink-dim);
		transition: all 0.15s ease;
	}
	.ic:hover:not(:disabled) {
		color: var(--color-ink);
		background: color-mix(in oklab, white 10%, transparent);
	}
	.ic:disabled {
		opacity: 0.5;
	}
</style>
