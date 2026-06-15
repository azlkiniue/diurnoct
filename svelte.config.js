import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * Base path support so the same build works on:
 *  - Cloudflare Pages / custom domain (served at "/")        -> BASE_PATH=""
 *  - GitHub Pages project site (served at "/<repo>")          -> BASE_PATH="/diurnoct"
 *
 * @type {import('@sveltejs/kit').Config}
 */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '404.html',
			precompress: false,
			strict: true
		}),
		paths: {
			base: process.env.BASE_PATH ?? ''
		}
	}
};

export default config;
