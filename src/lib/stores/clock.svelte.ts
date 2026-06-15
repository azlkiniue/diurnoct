/**
 * A single shared, reactive "now" that ticks once per second. Reading
 * `clock.now` inside any reactive context (template, $derived, $effect)
 * re-runs it every second — which is exactly the cadence the terminator and
 * the clocks need.
 */

import { browser } from '$app/environment';

class Clock {
	private _now = $state(Date.now());

	constructor() {
		if (browser) {
			// Align the first tick to the next whole second so the seconds digit
			// flips cleanly, then tick every second.
			const align = 1000 - (Date.now() % 1000);
			setTimeout(() => {
				this._now = Date.now();
				setInterval(() => {
					this._now = Date.now();
				}, 1000);
			}, align);
		}
	}

	/** Current instant as a Date (reactive). */
	get now(): Date {
		return new Date(this._now);
	}

	/** Current instant as epoch ms (reactive). */
	get ms(): number {
		return this._now;
	}
}

export const clock = new Clock();
