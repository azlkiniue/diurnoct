<script lang="ts">
	import { fade } from 'svelte/transition';
	import { APP_NAME } from '$lib/config';
	import Logo from './Logo.svelte';

	let { visible }: { visible: boolean } = $props();
</script>

{#if visible}
	<div
		class="starfield fixed inset-0 z-[60] grid place-items-center"
		transition:fade={{ duration: 450 }}
	>
		<div class="flex flex-col items-center gap-5">
			<div class="flex items-center gap-3">
				<span class="logo-pulse"><Logo size={30} /></span>
				<h1 class="text-2xl font-semibold tracking-tight lowercase">{APP_NAME}</h1>
			</div>
			<div class="loader-bar"><span></span></div>
			<p class="text-ink-dim text-xs tracking-wide">loading…</p>
		</div>
	</div>
{/if}

<style>
	.logo-pulse {
		display: inline-flex;
		animation: breathe 1.8s ease-in-out infinite;
		filter: drop-shadow(0 0 6px color-mix(in oklab, var(--color-day) 35%, transparent));
	}
	@keyframes breathe {
		0%,
		100% {
			transform: scale(1);
			opacity: 0.92;
		}
		50% {
			transform: scale(1.08);
			opacity: 1;
		}
	}
	.loader-bar {
		position: relative;
		width: 180px;
		height: 3px;
		overflow: hidden;
		border-radius: 9999px;
		background: color-mix(in oklab, white 12%, transparent);
	}
	.loader-bar span {
		position: absolute;
		top: 0;
		bottom: 0;
		left: -40%;
		width: 40%;
		border-radius: 9999px;
		background: var(--color-day);
		animation: slide 1.2s ease-in-out infinite;
	}
	@keyframes slide {
		0% {
			left: -40%;
		}
		100% {
			left: 100%;
		}
	}
</style>
