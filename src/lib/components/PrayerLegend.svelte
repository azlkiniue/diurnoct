<script lang="ts">
	import {
		PRAYER_KEYS,
		PRAYER_NAMES,
		type AsrSchool,
		type CalcMethod,
		type PrayerKey
	} from '$lib/astro/prayer';

	interface Props {
		method: CalcMethod;
		asr: AsrSchool;
		/** Whether any times are being estimated (no high-latitude rule → no dashed key). */
		estimating: boolean;
	}

	let { method, asr, estimating }: Props = $props();

	const below = (deg: number) => `sun ${deg}° below the horizon`;

	const meaning = $derived<Record<PrayerKey, string>>({
		fajr: below(method.fajr),
		sunrise: 'sun’s upper edge on the horizon',
		dhuhr: 'sun crosses the meridian',
		asr: `shadow = noon shadow + ${asr === 'hanafi' ? '2×' : '1×'} height`,
		maghrib: method.maghrib === undefined ? 'sunset' : below(method.maghrib),
		isha:
			'angle' in method.isha
				? below(method.isha.angle)
				: `${method.isha.minutes} min after Maghrib${method.isha.ramadanMinutes ? ` (${method.isha.ramadanMinutes} in Ramadan)` : ''}`
	});
</script>

<div class="panel rounded-xl px-3 py-2.5 text-xs">
	<ul class="space-y-1">
		{#each PRAYER_KEYS as key (key)}
			<li class="flex items-center gap-2">
				<span
					class="h-[3px] w-4 shrink-0 rounded-full"
					style={`background: var(--color-${key})`}
					aria-hidden="true"
				></span>
				<span class="w-14 font-medium text-[var(--color-ink)]">{PRAYER_NAMES[key].name}</span>
				<span class="hidden w-12 text-[var(--color-ink-dim)] sm:inline" lang="ar" dir="rtl">
					{PRAYER_NAMES[key].arabic}
				</span>
				<span class="hidden text-[11px] text-[var(--color-ink-dim)] sm:inline">{meaning[key]}</span>
			</li>
		{/each}
	</ul>
	{#if estimating}
		<div class="mt-2 space-y-1 border-t border-white/10 pt-2 text-[11px] text-[var(--color-ink-dim)]">
			<div class="flex items-center gap-2">
				<svg width="16" height="4" aria-hidden="true">
					<line x1="1" y1="2" x2="15" y2="2" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
				</svg>
				<span class="sm:hidden">observed</span>
				<span class="hidden sm:inline">the sign is observed</span>
			</div>
			<div class="flex items-center gap-2">
				<svg width="16" height="4" aria-hidden="true">
					<line x1="1" y1="2" x2="15" y2="2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="5 4" />
				</svg>
				<span class="sm:hidden">estimated</span>
				<span class="hidden sm:inline">estimated: twilight lasts all night</span>
			</div>
			<div class="flex items-center gap-2">
				<svg width="16" height="4" aria-hidden="true">
					<line x1="1" y1="2" x2="15" y2="2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="0.5 4" />
				</svg>
				<span class="sm:hidden">times of 45°</span>
				<span class="hidden sm:inline">estimated: no sunrise or sunset, times of 45°</span>
			</div>
		</div>
	{/if}
</div>
