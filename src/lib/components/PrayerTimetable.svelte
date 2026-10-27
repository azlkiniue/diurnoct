<script lang="ts">
	import {
		PRAYER_KEYS,
		PRAYER_NAMES,
		type Basis,
		type PrayerEvent,
		type PrayerTimeline
	} from '$lib/astro/prayer';
	import type { PlacePicker } from '$lib/map/place.svelte';
	import { formatCountdown, formatTime, tzAbbrev } from '$lib/time';
	import PlacePanel from './PlacePanel.svelte';

	interface Props {
		/** For the picker's place; null while none is pinned. */
		timeline: PrayerTimeline | null;
		current: PrayerEvent | null;
		next: PrayerEvent | null;
		now: Date;
		picker: PlacePicker;
	}

	let { timeline, current, next, now, picker }: Props = $props();

	const tz = $derived(picker.place?.tz);

	const ESTIMATED: Record<Exclude<Basis, 'sun'>, string> = {
		rule: 'Estimated: twilight doesn’t end here, so the high-latitude rule sets this time',
		ref45: 'Estimated: the sun doesn’t rise or set here today, so this is the time at latitude 45°'
	};

	/**
	 * Whole minutes, erring safe as published timetables do: a prayer's start
	 * rounds up (never shown before it begins), sunrise — the end of Fajr — down.
	 */
	function shown(key: string, time: Date): Date {
		const round = key === 'sunrise' ? Math.floor : Math.ceil;
		return new Date(round(time.getTime() / 60_000) * 60_000);
	}

	const isCurrent = (key: string) =>
		!!current &&
		current.key === key &&
		timeline?.today[current.key]?.time.getTime() === current.time.getTime();
</script>

<PlacePanel subject="Prayer times" {picker}>
	{#if timeline}
		{#if next}
			<div class="mt-2 text-[var(--color-ink)]">
				<span style={`color: var(--color-${next.key})`} class="font-semibold">
					{PRAYER_NAMES[next.key].name}
				</span>
				in <span class="tnum">{formatCountdown(now, next.time)}</span>
			</div>
		{/if}

		<ul class="mt-2 space-y-0.5 border-t border-white/10 pt-2">
			{#each PRAYER_KEYS as key (key)}
				{@const t = timeline.today[key]}
				<li
					class="flex items-center gap-2 rounded-md px-1.5 py-0.5"
					style={isCurrent(key) ? 'background-color: color-mix(in oklab, white 9%, transparent)' : ''}
					aria-current={isCurrent(key) ? 'time' : undefined}
				>
					<span
						class="h-3 w-[3px] shrink-0 rounded-full"
						style={`background: var(--color-${key})`}
						aria-hidden="true"
					></span>
					<span class="flex-1 text-[var(--color-ink)]">{PRAYER_NAMES[key].name}</span>
					{#if t && t.basis !== 'sun'}
						<span
							class="rounded border border-[var(--color-dusk)]/40 px-1 text-[10px] leading-4 text-[var(--color-dusk)]"
							title={ESTIMATED[t.basis]}
						>
							est.
						</span>
					{/if}
					<span class="tnum w-10 text-right font-medium text-[var(--color-ink)]">
						{t ? formatTime(shown(key, t.time), tz, false) : '—'}
					</span>
				</li>
			{/each}
		</ul>

		<div class="mt-2 text-[10px] text-[var(--color-ink-dim)]">
			{tz ? 'Local time' : 'In your time zone'} ({tzAbbrev(now, tz)})
		</div>
	{/if}
</PlacePanel>
