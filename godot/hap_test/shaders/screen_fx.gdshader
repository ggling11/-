// 가벼운 화면 셰이더 (높음·최고): 색 갈라짐 + 필름 그레인 + 옅은 비네트.
shader_type canvas_item;

uniform sampler2D screen_tex : hint_screen_texture, filter_linear;
uniform float ca = 0.0022;
uniform float grain = 0.022;
uniform float vignette = 0.28;

void fragment() {
	vec2 uv = SCREEN_UV;
	vec2 dir = uv - 0.5;
	float d = length(dir);
	vec2 off = dir * ca * (0.4 + d * 2.0);
	vec3 c;
	c.r = texture(screen_tex, uv + off).r;
	c.g = texture(screen_tex, uv).g;
	c.b = texture(screen_tex, uv - off).b;
	float n = fract(sin(dot(floor(FRAGCOORD.xy) + fract(TIME * 7.13) * 97.0, vec2(12.9898, 78.233))) * 43758.5453);
	c += (n - 0.5) * grain;
	c *= 1.0 - vignette * smoothstep(0.32, 0.9, d);
	COLOR = vec4(c, 1.0);
}
