// 노을 하늘: 위는 짙은 남색, 지평은 주황빛, 해 쪽으로 따뜻한 번짐.
shader_type sky;

uniform vec3 top_col : source_color = vec3(0.16, 0.24, 0.46);
uniform vec3 mid_col : source_color = vec3(0.62, 0.52, 0.6);
uniform vec3 horizon_col : source_color = vec3(1.0, 0.70, 0.45);
uniform vec3 ground_col : source_color = vec3(0.22, 0.15, 0.17);
uniform float energy = 1.0;
uniform float sun_size = 0.035;

void sky() {
	vec3 d = EYEDIR;
	float y = d.y;
	vec3 c;
	if (y > 0.0) {
		c = mix(mid_col, top_col, pow(clamp(y, 0.0, 1.0), 0.5));
		c = mix(horizon_col, c, smoothstep(0.0, 0.22, y));
	} else {
		c = mix(horizon_col, ground_col, smoothstep(0.0, 0.1, -y));
	}
	if (LIGHT0_ENABLED) {
		float sd = max(dot(d, LIGHT0_DIRECTION), 0.0);
		c += LIGHT0_COLOR * (pow(sd, 6.0) * 0.35 + pow(sd, 48.0) * 0.9);
		float disc = smoothstep(cos(sun_size), cos(sun_size * 0.7), sd);
		c += LIGHT0_COLOR * disc * 6.0;
	}
	COLOR = c * energy;
}
