// 풀포기 (MultiMesh). 한 판에 잎날 다섯 개를 UV로 그리고 바람에 흔든다.
shader_type spatial;
render_mode cull_disabled, depth_draw_opaque;

uniform vec3 base_col : source_color = vec3(0.30, 0.27, 0.15);
uniform vec3 tip_col : source_color = vec3(0.80, 0.68, 0.40);
uniform float wind = 0.07;

void vertex() {
	vec3 wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	float h = clamp(VERTEX.y / 0.7, 0.0, 1.0);
	float s = sin(TIME * 1.6 + wp.x * 0.55 + wp.z * 0.43) + 0.4 * sin(TIME * 3.1 + wp.z * 1.3);
	VERTEX.x += s * wind * h * h;
	VERTEX.z += s * wind * 0.5 * h * h;
}

void fragment() {
	float h = 1.0 - UV.y;  // 0 = 뿌리, 1 = 끝
	float a = 0.0;
	for (int i = 0; i < 5; i++) {
		float fi = float(i);
		float top = 0.62 + 0.38 * fract(sin(fi * 12.9898) * 43758.5453);
		float lean = (fract(sin(fi * 78.233) * 12345.678) - 0.5) * 0.35;
		float cx = 0.18 + fi * 0.16 + lean * h;
		float half_w = 0.055 * (1.0 - h / top);
		a = max(a, step(abs(UV.x - cx), half_w) * step(h, top));
	}
	ALPHA = a;
	ALPHA_SCISSOR_THRESHOLD = 0.5;
	vec3 c = mix(base_col, tip_col, smoothstep(0.0, 0.9, h)) * COLOR.rgb;
	ALBEDO = c;
	ROUGHNESS = 0.95;
	BACKLIGHT = c * 0.35;
}
