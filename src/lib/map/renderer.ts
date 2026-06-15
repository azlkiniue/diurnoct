/**
 * DayNightRenderer — a small, dependency-free WebGL renderer that composites a
 * day (Blue Marble) and night (city-lights) equirectangular texture into a
 * real-time terminator map.
 *
 * It is intentionally cheap: it only redraws when asked (`render()`), so a
 * once-per-second tick from the clock keeps CPU/GPU usage negligible — ideal
 * for a wallpaper that may run for hours.
 */

import { geoToVec3, type GeoPoint } from '$lib/astro/solar';
import { computeMapRect, type FitMode } from './projection';
import { FRAGMENT_SHADER, VERTEX_SHADER } from './shaders';

export interface RenderParams {
	nightBrightness: number;
	/** Half-width of the twilight band, in cos(zenith) units (~0 = crisp). */
	twilight: number;
	/** 0..1 warm glow along the terminator. */
	dusk: number;
	fit: FitMode;
}

const DEFAULT_PARAMS: RenderParams = {
	nightBrightness: 1,
	twilight: 0.12,
	dusk: 0.5,
	fit: 'contain'
};

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
	const shader = gl.createShader(type)!;
	gl.shaderSource(shader, src);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const log = gl.getShaderInfoLog(shader);
		gl.deleteShader(shader);
		throw new Error(`Shader compile failed: ${log}`);
	}
	return shader;
}

export class DayNightRenderer {
	private canvas: HTMLCanvasElement;
	private gl: WebGLRenderingContext | null = null;
	private program: WebGLProgram | null = null;
	private buffer: WebGLBuffer | null = null;
	private uniforms: Record<string, WebGLUniformLocation | null> = {};
	private dayTex: WebGLTexture | null = null;
	private nightTex: WebGLTexture | null = null;
	private hasDay = 0;
	private hasNight = 0;
	private dayDone = false;
	private nightDone = false;
	private readyFired = false;
	private readyTimer: ReturnType<typeof setTimeout> | undefined;

	/** Invoked once after both textures reach a terminal state (loaded or failed). */
	onReady: (() => void) | null = null;

	private cssW = 1;
	private cssH = 1;
	private dpr = 1;

	private sunDir: [number, number, number] = [1, 0, 0];
	private params: RenderParams = { ...DEFAULT_PARAMS };

	private dayUrls: string[] = [];
	private nightUrls: string[] = [];

	private disposed = false;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		canvas.addEventListener('webglcontextlost', this.onContextLost, false);
		canvas.addEventListener('webglcontextrestored', this.onContextRestored, false);
		this.init();
	}

	/** Whether a usable WebGL context is available. */
	get ok(): boolean {
		return this.gl !== null;
	}

	private init() {
		const gl =
			this.canvas.getContext('webgl', {
				alpha: true,
				antialias: false,
				depth: false,
				stencil: false,
				premultipliedAlpha: true,
				powerPreference: 'low-power'
			}) ||
			(this.canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);

		if (!gl) {
			this.gl = null;
			return;
		}
		this.gl = gl;

		const program = gl.createProgram()!;
		gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
		gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			throw new Error(`Program link failed: ${gl.getProgramInfoLog(program)}`);
		}
		gl.useProgram(program);
		this.program = program;

		for (const name of [
			'uDay',
			'uNight',
			'uSunDir',
			'uTwilight',
			'uNightBright',
			'uHasDay',
			'uHasNight',
			'uDusk'
		]) {
			this.uniforms[name] = gl.getUniformLocation(program, name);
		}
		gl.uniform1i(this.uniforms.uDay, 0);
		gl.uniform1i(this.uniforms.uNight, 1);

		this.buffer = gl.createBuffer();

		this.dayTex = this.createTexture(gl, [20, 60, 130]);
		this.nightTex = this.createTexture(gl, [3, 5, 12]);
		this.hasDay = 0;
		this.hasNight = 0;

		gl.clearColor(0, 0, 0, 0);

		// (Re)load textures if URLs were already provided (e.g. after restore).
		if (this.dayUrls.length) this.beginLoad(this.dayUrls, 'day');
		if (this.nightUrls.length) this.beginLoad(this.nightUrls, 'night');

		this.updateGeometry();
	}

	private createTexture(gl: WebGLRenderingContext, rgb: [number, number, number]): WebGLTexture {
		const tex = gl.createTexture()!;
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA,
			1,
			1,
			0,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			new Uint8Array([...rgb, 255])
		);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		return tex;
	}

	/** Provide ordered candidate URLs for each texture; the first that loads wins. */
	setTextureSources(dayUrls: string[], nightUrls: string[]) {
		this.dayUrls = dayUrls;
		this.nightUrls = nightUrls;
		this.dayDone = false;
		this.nightDone = false;
		this.readyFired = false;
		clearTimeout(this.readyTimer);
		// Safety net: reveal the map even if the network stalls.
		this.readyTimer = setTimeout(() => {
			this.markDone('day');
			this.markDone('night');
		}, 12000);
		this.beginLoad(dayUrls, 'day');
		this.beginLoad(nightUrls, 'night');
	}

	private markDone(which: 'day' | 'night') {
		if (which === 'day') this.dayDone = true;
		else this.nightDone = true;
		if (!this.readyFired && this.dayDone && this.nightDone) {
			this.readyFired = true;
			clearTimeout(this.readyTimer);
			this.onReady?.();
		}
	}

	private beginLoad(urls: string[], which: 'day' | 'night') {
		if (!urls.length) return;
		this.tryLoad(urls, 0, which);
	}

	private tryLoad(urls: string[], i: number, which: 'day' | 'night') {
		if (this.disposed) return;
		if (i >= urls.length) {
			// All candidates failed — treat as done; the shader uses a fallback.
			this.markDone(which);
			return;
		}
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.decoding = 'async';
		img.onload = () => {
			if (this.disposed || !this.gl) return;
			const gl = this.gl;
			const tex = which === 'day' ? this.dayTex : this.nightTex;
			gl.bindTexture(gl.TEXTURE_2D, tex);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
			try {
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
				if (which === 'day') this.hasDay = 1;
				else this.hasNight = 1;
				this.render();
				this.markDone(which);
			} catch {
				this.tryLoad(urls, i + 1, which);
			}
		};
		img.onerror = () => this.tryLoad(urls, i + 1, which);
		img.src = urls[i];
	}

	setSun(point: GeoPoint) {
		this.sunDir = geoToVec3(point);
	}

	setParams(params: Partial<RenderParams>) {
		const fitChanged = params.fit !== undefined && params.fit !== this.params.fit;
		this.params = { ...this.params, ...params };
		if (fitChanged) this.updateGeometry();
	}

	resize(cssW: number, cssH: number, dpr: number) {
		this.cssW = Math.max(1, cssW);
		this.cssH = Math.max(1, cssH);
		this.dpr = Math.min(Math.max(dpr, 1), 2);
		this.canvas.width = Math.round(this.cssW * this.dpr);
		this.canvas.height = Math.round(this.cssH * this.dpr);
		this.gl?.viewport(0, 0, this.canvas.width, this.canvas.height);
		this.updateGeometry();
	}

	/** Rebuild the map quad (two triangles) for the current size + fit mode. */
	private updateGeometry() {
		const gl = this.gl;
		if (!gl || !this.buffer) return;
		const r = computeMapRect(this.cssW, this.cssH, this.params.fit);

		// Pixel -> clip space (dpr-independent: clip is -1..1 across the canvas).
		const cx = (px: number) => (px / this.cssW) * 2 - 1;
		const cy = (py: number) => 1 - (py / this.cssH) * 2;

		const l = r.left;
		const t = r.top;
		const rt = r.left + r.width;
		const b = r.top + r.height;

		// interleaved: x, y, u, v
		const verts = new Float32Array([
			cx(l), cy(t), 0, 0,
			cx(rt), cy(t), 1, 0,
			cx(rt), cy(b), 1, 1,
			cx(l), cy(t), 0, 0,
			cx(rt), cy(b), 1, 1,
			cx(l), cy(b), 0, 1
		]);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
		gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
	}

	render() {
		const gl = this.gl;
		if (!gl || !this.program) return;

		gl.useProgram(this.program);
		gl.clear(gl.COLOR_BUFFER_BIT);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
		const aPos = gl.getAttribLocation(this.program, 'aPos');
		const aUv = gl.getAttribLocation(this.program, 'aUv');
		gl.enableVertexAttribArray(aPos);
		gl.enableVertexAttribArray(aUv);
		gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
		gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 16, 8);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.dayTex);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.nightTex);

		gl.uniform3fv(this.uniforms.uSunDir, this.sunDir);
		gl.uniform1f(this.uniforms.uTwilight, this.params.twilight);
		gl.uniform1f(this.uniforms.uNightBright, this.params.nightBrightness);
		gl.uniform1f(this.uniforms.uDusk, this.params.dusk);
		gl.uniform1f(this.uniforms.uHasDay, this.hasDay);
		gl.uniform1f(this.uniforms.uHasNight, this.hasNight);

		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

	private onContextLost = (e: Event) => {
		e.preventDefault();
		this.gl = null;
	};

	private onContextRestored = () => {
		if (this.disposed) return;
		this.init();
		this.render();
	};

	dispose() {
		this.disposed = true;
		clearTimeout(this.readyTimer);
		this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
		this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
		const gl = this.gl;
		if (!gl) return;
		gl.deleteProgram(this.program);
		gl.deleteBuffer(this.buffer);
		gl.deleteTexture(this.dayTex);
		gl.deleteTexture(this.nightTex);
		this.gl = null;
	}
}
