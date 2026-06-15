/** GLSL ES 1.00 shaders for the day/night terminator composite (WebGL1). */

export const VERTEX_SHADER = /* glsl */ `
attribute vec2 aPos;
attribute vec2 aUv;
varying vec2 vUv;
void main() {
	vUv = aUv;
	gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D uDay;
uniform sampler2D uNight;
uniform vec3 uSunDir;       // unit vector toward the sun
uniform float uTwilight;    // half-width of the twilight band, in cos(zenith) units
uniform float uNightBright; // brightness multiplier for the city-lights texture
uniform float uHasDay;      // 1.0 if the day texture has loaded
uniform float uHasNight;    // 1.0 if the night texture has loaded
uniform float uDusk;        // 0..1 intensity of the warm glow along the terminator

const float PI = 3.141592653589793;

void main() {
	// Equirectangular UV -> geographic radians.
	float lon = (vUv.x * 2.0 - 1.0) * PI;
	float lat = (0.5 - vUv.y) * PI;
	float cosLat = cos(lat);
	vec3 n = vec3(cosLat * cos(lon), sin(lat), cosLat * sin(lon));

	// Cosine of the solar zenith angle: > 0 is daylight.
	float cosZen = dot(n, uSunDir);

	float tw = max(uTwilight, 0.0001);
	float t = clamp((cosZen + tw) / (2.0 * tw), 0.0, 1.0);
	t = t * t * (3.0 - 2.0 * t); // smoothstep easing across the twilight band

	vec3 dayCol = (uHasDay > 0.5) ? texture2D(uDay, vUv).rgb : vec3(0.16, 0.38, 0.74);

	// Night = a dim version of the daytime earth, plus city lights on top.
	vec3 base = (uHasDay > 0.5) ? dayCol * 0.06 : vec3(0.015, 0.025, 0.05);
	vec3 lights = (uHasNight > 0.5) ? texture2D(uNight, vUv).rgb * uNightBright : vec3(0.0);
	vec3 nightCol = base + lights;

	vec3 col = mix(nightCol, dayCol, t);

	// A warm rim where the sun is near the horizon.
	float edge = clamp(1.0 - abs(cosZen) / (tw * 2.0), 0.0, 1.0);
	col += vec3(1.0, 0.5, 0.22) * edge * edge * uDusk;

	gl_FragColor = vec4(col, 1.0);
}
`;
