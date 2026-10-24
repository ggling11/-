// 낙엽 (바닥 MultiMesh · 떨어지는 잎 파티클 공용). 잎 모양은 UV로 그린다 (질감 없음, 알파 가위).
// 색은 MultiMesh 인스턴스 색 / 파티클 색(COLOR)에서 온다.
shader_type spatial;
render_mode cull_disabled, depth_draw_opaque;

uniform float rough = 0.82;
uniform float translucency = 0.45;

void fragment() {
	vec2 p = UV * 2.0 - 1.0;
	// 잎: 위아래 끝이 뾰족한 타원 + 짧은 잎자루
	float w = 0.62 * (1.0 - p.y * p.y) * (1.0 - 0.18 * p.y);
	float blade = step(abs(p.x), w) * step(p.y, 0.92);
	float stem = step(abs(p.x), 0.05) * step(0.6, p.y);
	ALPHA = max(blade, stem);
	ALPHA_SCISSOR_THRESHOLD = 0.5;
	float vein = smoothstep(0.05, 0.0, abs(p.x)) * 0.3;
	float edge = clamp(abs(p.x) / max(w, 0.02), 0.0, 1.0);
	vec3 c = COLOR.rgb * (1.0 - vein) * (1.05 - 0.25 * edge);
	ALBEDO = c;
	ROUGHNESS = rough;
	BACKLIGHT = c * translucency;
}
