<script lang="ts">
	import { REPO_URL } from '$lib/config';
	import { settings, LAYER_META, type Verbosity, type LayerKey } from '$lib/stores/settings.svelte';
	import type { FitMode } from '$lib/map/projection';
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		onclose: () => void;
	}
	let { open, onclose }: Props = $props();

	const s = settings; // `s.current` is reactive

	function pad(n: number) {
		return String(n).padStart(2, '0');
	}
	function toInput(iso: string): string {
		const d = iso ? new Date(iso) : new Date();
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}
	function fromInput(v: string): string {
		const d = new Date(v);
		return Number.isNaN(d.getTime()) ? '' : d.toISOString();
	}
	function setCustomNow() {
		s.setTime('mode', 'custom');
		s.setTime('customISO', new Date().toISOString());
	}
	function nudge(hours: number) {
		const base = s.current.time.customISO ? new Date(s.current.time.customISO) : new Date();
		s.setTime('mode', 'custom');
		s.setTime('customISO', new Date(base.getTime() + hours * 3600_000).toISOString());
	}
	function sweepDay(minutes: number) {
		const base = s.current.time.customISO ? new Date(s.current.time.customISO) : new Date();
		base.setHours(Math.floor(minutes / 60), Math.round(minutes % 60), 0, 0);
		s.setTime('mode', 'custom');
		s.setTime('customISO', base.toISOString());
	}
	const sweepValue = $derived.by(() => {
		const d = s.current.time.customISO ? new Date(s.current.time.customISO) : new Date();
		return d.getHours() * 60 + d.getMinutes();
	});
</script>

{#snippet seg(options: { k: string; l: string }[], active: string, onpick: (k: string) => void)}
	<div
		class="grid gap-1.5 rounded-xl bg-white/5 p-1"
		style={`grid-template-columns: repeat(${options.length}, minmax(0, 1fr))`}
	>
		{#each options as o (o.k)}
			<button
				type="button"
				class={`rounded-lg px-2 py-1.5 text-xs font-medium transition ${
					active === o.k
						? 'bg-[var(--color-day)] text-[var(--color-space)]'
						: 'text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]'
				}`}
				onclick={() => onpick(o.k)}
			>
				{o.l}
			</button>
		{/each}
	</div>
{/snippet}

{#snippet toggleRow(label: string, hint: string, checked: boolean, onchange: () => void)}
	<button
		type="button"
		class="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-white/5"
		onclick={onchange}
		role="switch"
		aria-checked={checked}
	>
		<span class="min-w-0">
			<span class="block text-sm text-[var(--color-ink)]">{label}</span>
			<span class="block truncate text-xs text-[var(--color-ink-dim)]">{hint}</span>
		</span>
		<span
			class={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${checked ? 'bg-[var(--color-day)]' : ''}`}
			style={checked ? '' : 'background-color: color-mix(in oklab, white 16%, transparent)'}
		>
			<span
				class="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform"
				style={`transform: translateX(${checked ? '18px' : '3px'})`}
			></span>
		</span>
	</button>
{/snippet}

{#snippet section(title: string, body: Snippet)}
	<section class="border-t border-white/10 px-4 py-4 first:border-t-0">
		{#if title}
			<h3 class="mb-2 text-[11px] font-semibold tracking-widest text-[var(--color-ink-dim)] uppercase">
				{title}
			</h3>
		{/if}
		{@render body()}
	</section>
{/snippet}

{#snippet sliderRow(
	label: string,
	value: string,
	min: number,
	max: number,
	step: number,
	current: number,
	oninput: (v: number) => void,
	disabled = false
)}
	<label class={`block ${disabled ? 'opacity-40' : ''}`}>
		<div class="mb-1 flex justify-between text-xs text-[var(--color-ink-dim)]">
			<span>{label}</span>
			<span class="tnum">{value}</span>
		</div>
		<input
			type="range"
			{min}
			{max}
			{step}
			{disabled}
			class="w-full"
			value={current}
			oninput={(e) => oninput(e.currentTarget.valueAsNumber)}
		/>
	</label>
{/snippet}

<!-- Backdrop -->
{#if open}
	<button
		type="button"
		aria-label="Close settings"
		class="fixed inset-0 z-40 bg-black/30"
		onclick={onclose}
	></button>
{/if}

<aside
	class="panel scroll-thin fixed top-0 right-0 z-50 flex h-full w-[340px] max-w-[90vw] flex-col overflow-y-auto rounded-l-2xl shadow-2xl transition-transform duration-300"
	style={`transform: translateX(${open ? '0' : '100%'})`}
	inert={!open}
>
	<header
		class="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[var(--color-space-2)]/80 px-4 py-3 backdrop-blur"
	>
		<h2 class="text-sm font-semibold">Settings</h2>
		<button
			type="button"
			class="rounded-lg p-1.5 text-[var(--color-ink-dim)] transition hover:bg-white/10 hover:text-white"
			aria-label="Close"
			onclick={onclose}
		>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
			</svg>
		</button>
	</header>

	{#snippet verbosityBody()}
		{@render seg(
			[
				{ k: 'minimal', l: 'Minimal' },
				{ k: 'standard', l: 'Standard' },
				{ k: 'detailed', l: 'Detailed' }
			],
			s.current.verbosity,
			(k) => s.setPreset(k as Exclude<Verbosity, 'custom'>)
		)}
		{#if s.current.verbosity === 'custom'}
			<p class="mt-2 text-xs text-[var(--color-ink-dim)]">Custom — tuned with the layers below.</p>
		{/if}
	{/snippet}
	{@render section('Verbosity', verbosityBody)}

	{#snippet layersBody()}
		<div class="-mx-2">
			{#each LAYER_META as l (l.key)}
				{@render toggleRow(l.label, l.hint, s.current.layers[l.key], () =>
					s.toggleLayer(l.key as LayerKey)
				)}
			{/each}
		</div>
	{/snippet}
	{@render section('Info layers', layersBody)}

	{#snippet mapBody()}
		<div class="space-y-4">
			<div>
				<div class="mb-1.5 text-xs text-[var(--color-ink-dim)]">Framing</div>
				{@render seg(
					[
						{ k: 'contain', l: 'Fit · whole map' },
						{ k: 'cover', l: 'Fill · crop' }
					],
					s.current.map.fit,
					(k) => s.setMap('fit', k as FitMode)
				)}
			</div>

			{@render sliderRow(
				'Night-lights brightness',
				`${s.current.map.nightBrightness.toFixed(2)}×`,
				0.2,
				2,
				0.05,
				s.current.map.nightBrightness,
				(v) => s.setMap('nightBrightness', v)
			)}

			{@render toggleRow(
				'Soft twilight',
				'Blended dusk band at the terminator',
				s.current.map.softTwilight,
				() => s.setMap('softTwilight', !s.current.map.softTwilight)
			)}

			{@render sliderRow(
				'Twilight width',
				`${s.current.map.twilightDegrees}°`,
				1,
				18,
				1,
				s.current.map.twilightDegrees,
				(v) => s.setMap('twilightDegrees', v),
				!s.current.map.softTwilight
			)}

			{@render sliderRow(
				'Terminator glow',
				`${Math.round(s.current.map.dusk * 100)}%`,
				0,
				1,
				0.05,
				s.current.map.dusk,
				(v) => s.setMap('dusk', v)
			)}

			{@render toggleRow(
				'Starfield',
				'Stars behind the map when letterboxed',
				s.current.map.showStars,
				() => s.setMap('showStars', !s.current.map.showStars)
			)}

			{@render sliderRow(
				'HUD size',
				`${Math.round(s.current.ui.hudScale * 100)}%`,
				0.7,
				1.5,
				0.05,
				s.current.ui.hudScale,
				(v) => s.setUI('hudScale', v)
			)}

			{@render toggleRow(
				'Auto-hide controls',
				'Fade the toolbar when idle',
				s.current.ui.autoHide,
				() => s.setUI('autoHide', !s.current.ui.autoHide)
			)}
		</div>
	{/snippet}
	{@render section('Map & style', mapBody)}

	{#snippet timeBody()}
		<div class="space-y-3">
			{@render seg(
				[
					{ k: 'live', l: 'Live' },
					{ k: 'custom', l: 'Custom' }
				],
				s.current.time.mode,
				(k) => (k === 'custom' ? setCustomNow() : s.setTime('mode', 'live'))
			)}

			{#if s.current.time.mode === 'custom'}
				<input
					type="datetime-local"
					class="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-[var(--color-ink)] [color-scheme:dark]"
					value={toInput(s.current.time.customISO)}
					oninput={(e) => s.setTime('customISO', fromInput(e.currentTarget.value))}
				/>
				<div class="flex flex-wrap gap-1.5">
					{#each [{ l: '−6h', h: -6 }, { l: '−1h', h: -1 }, { l: '+1h', h: 1 }, { l: '+6h', h: 6 }] as b (b.l)}
						<button
							type="button"
							class="rounded-lg border border-white/10 px-2.5 py-1 text-xs transition hover:bg-white/10"
							onclick={() => nudge(b.h)}>{b.l}</button
						>
					{/each}
					<button
						type="button"
						class="rounded-lg border border-white/10 px-2.5 py-1 text-xs transition hover:bg-white/10"
						onclick={setCustomNow}>Now</button
					>
				</div>
				{@render sliderRow(
					'Sweep through the day',
					'',
					0,
					1439,
					5,
					sweepValue,
					(v) => sweepDay(v)
				)}
			{:else}
				<p class="text-xs text-[var(--color-ink-dim)]">
					Following the current time, updating every second.
				</p>
			{/if}
		</div>
	{/snippet}
	{@render section('Time', timeBody)}

	{#snippet texBody()}
		<div class="space-y-3">
			{@render seg(
				[
					{ k: 'auto', l: 'Auto' },
					{ k: 'remote', l: 'CDN' },
					{ k: 'custom', l: 'Custom' }
				],
				s.current.texture.source,
				(k) => s.setTexture('source', k as 'auto' | 'remote' | 'custom')
			)}
			{#if s.current.texture.source === 'custom'}
				<input
					type="url"
					placeholder="Day texture URL (equirectangular)"
					class="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs"
					value={s.current.texture.customDay}
					oninput={(e) => s.setTexture('customDay', e.currentTarget.value)}
				/>
				<input
					type="url"
					placeholder="Night texture URL (city lights)"
					class="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs"
					value={s.current.texture.customNight}
					oninput={(e) => s.setTexture('customNight', e.currentTarget.value)}
				/>
			{:else}
				<p class="text-xs text-[var(--color-ink-dim)]">
					Auto prefers a local <code class="text-[var(--color-ink)]">/textures</code> copy and falls
					back to a CDN. Run
					<code class="text-[var(--color-ink)]">bun run fetch-textures</code> to self-host.
				</p>
			{/if}
		</div>
	{/snippet}
	{@render section('Satellite textures', texBody)}

	{#snippet footerBody()}
		<div class="space-y-3">
			<button
				type="button"
				class="w-full rounded-lg border border-white/10 px-3 py-2 text-sm transition hover:bg-white/10"
				onclick={() => s.reset()}>Reset to defaults</button
			>
			<div class="text-xs text-[var(--color-ink-dim)]">
				<div class="mb-1 font-medium text-[var(--color-ink)]">Shortcuts</div>
				<div class="grid grid-cols-2 gap-y-1">
					<span><kbd class="kbd">H</kbd> hide UI</span>
					<span><kbd class="kbd">F</kbd> fullscreen</span>
					<span><kbd class="kbd">S</kbd> settings</span>
					<span><kbd class="kbd">Esc</kbd> close</span>
				</div>
			</div>
			<a
				href={REPO_URL}
				target="_blank"
				rel="noreferrer"
				class="block text-xs text-[var(--color-ink-dim)] underline-offset-2 hover:text-[var(--color-ink)] hover:underline"
			>
				About diurnoct ↗
			</a>
		</div>
	{/snippet}
	{@render section('', footerBody)}
</aside>

<style>
	.kbd {
		display: inline-block;
		min-width: 1.4em;
		padding: 0 0.3em;
		text-align: center;
		border-radius: 4px;
		border: 1px solid color-mix(in oklab, white 16%, transparent);
		background: color-mix(in oklab, white 6%, transparent);
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--color-ink);
	}
</style>
