// 빛줄기: 해 쪽에서 비스듬히 내려오는 옅은 판 (가산 혼합). 천천히 숨쉬기만 한다.
shader_type spatial;
render_mode unshaded, blend_add, cull_disabled, depth_draw_never, shadows_disabled;

uniform vec3 col : source_color = vec3(1.0, 0.78, 0.56);
uniform float strength = 0.06;
uniform float phase = 0.0;

void fragment() {
	float across = smoothstep(0.0, 0.4, UV.x) * smoothstep(1.0, 0.6, UV.x);
	float along = smoothstep(0.0, 0.25, UV.y) * smoothstep(1.0, 0.45, UV.y);
	float breathe = 0.78 + 0.22 * sin(TIME * 0.35 + phase);
	float facing = abs(dot(normalize(NORMAL), normalize(VIEW)));
	ALBEDO = col * strength * across * along * breathe * facing;
}
