// 충격파 고리: 바닥에 눕힌 판에 고리를 그린다. progress 0 -> 1 동안 퍼지며 사라진다.
shader_type spatial;
render_mode unshaded, blend_add, cull_disabled, depth_draw_never, shadows_disabled;

uniform vec3 col : source_color = vec3(1.0, 0.62, 0.32);
uniform float energy = 1.2;
uniform float progress = 0.0;

void fragment() {
	vec2 p = UV * 2.0 - 1.0;
	float r = length(p);
	float width = mix(0.16, 0.035, progress);
	float ring = smoothstep(width, 0.0, abs(r - 0.86));
	float inner = smoothstep(0.86, 0.2, r) * 0.12 * (1.0 - progress);
	float fade = (1.0 - progress);
	fade = fade * fade;
	ALBEDO = col * energy * (ring + inner) * fade;
}
