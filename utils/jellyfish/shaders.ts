// GLSL for the jellyfish demo. The pulse is a pure function of time, so the
// CPU (thrust) and the GPU (bell shape) stay in step without sharing state.

const pulse = /* glsl */ `
  const float TAU = 6.2831853;

  // 0 relaxed, 1 fully contracted: a quick squeeze, then a slow release.
  float contraction(float phase) {
    float p = fract(phase / TAU);
    return p < 0.3 ? smoothstep(0.0, 0.3, p) : 1.0 - smoothstep(0.3, 1.0, p);
  }

  float depthFade(float viewZ) {
    return exp(-max(0.0, -viewZ - 7.0) * 0.05);
  }
`

// Sunlight focused by surface waves into a moving net of bright lines. Tiles
// once per unit of uv.
const water = /* glsl */ `
  float caustic(vec2 uv, float t) {
    vec2 p = mod(uv * 6.2831853, 6.2831853) - 250.0;
    vec2 i = p;
    float c = 1.0;
    const float intensity = 0.005;
    for (int n = 0; n < 4; n++) {
      float tt = t * (1.0 - 3.5 / float(n + 1));
      i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
      c += 1.0 / length(vec2(
        p.x / (sin(i.x + tt) / intensity),
        p.y / (cos(i.y + tt) / intensity)
      ));
    }
    c = 1.17 - pow(max(c / 4.0, 0.0), 1.4);
    c = pow(abs(c), 8.0);
    return isnan(c) ? 0.0 : clamp(c, 0.0, 1.0);
  }
`

export const bellVertexShader = /* glsl */ `
  attribute vec3 aColor;
  attribute vec2 aPulse;
  attribute float aGlow;
  // bell height, rim flare, stripe count, rim lobes
  attribute vec4 aForm;

  uniform float uTime;
  uniform float uScale;
  uniform float uLift;

  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vColor;
  varying float vAlong;
  varying float vAngle;
  varying float vGlow;
  varying float vFade;
  varying vec3 vWorld;
  varying float vUp;
  varying float vStripes;

  ${pulse}

  void main() {
    float phase = uTime * aPulse.x + aPulse.y;
    float along = uv.y;
    float angle = uv.x * TAU;
    float squeeze = contraction(phase - along * 1.2);
    float weight = smoothstep(0.15, 1.0, along);

    vec3 p = position;
    p.y *= aForm.x;
    p.xz *= 1.0 + aForm.y * along * along;
    p.xz *= 1.0 - squeeze * 0.3 * weight;
    p.y += squeeze * 0.08 - squeeze * 0.22 * weight;
    // A scalloped rim that ripples as the bell works.
    float rim4 = along * along * along * along;
    p.xz *= 1.0 + 0.05 * sin(angle * aForm.w + phase * 0.5) * rim4;
    p = p * uScale + vec3(0.0, uLift * aForm.x, 0.0);
    vStripes = aForm.z;

    vec4 world = instanceMatrix * vec4(p, 1.0);
    vec3 worldNormal = mat3(instanceMatrix) * normal;
    vWorld = world.xyz;
    vUp = worldNormal.y / max(length(worldNormal), 1e-5);
    vec4 mv = modelViewMatrix * world;
    vNormal = normalMatrix * mat3(instanceMatrix) * normal;
    vView = mv.xyz;
    vColor = aColor;
    vAlong = along;
    vAngle = angle;
    vGlow = aGlow;
    vFade = depthFade(mv.z);
    gl_Position = projectionMatrix * mv;
  }
`

export const bellFragmentShader = /* glsl */ `
  uniform float uBase;
  uniform float uFresnel;
  uniform float uStripes;
  uniform float uStripePower;
  uniform float uStripeGain;
  uniform float uRim;
  uniform vec3 uTint;
  uniform float uTintMix;
  uniform float uTime;
  uniform float uCaustic;
  uniform float uOwnStripes;

  varying float vStripes;
  varying vec3 vWorld;
  varying float vUp;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vColor;
  varying float vAlong;
  varying float vAngle;
  varying float vGlow;
  varying float vFade;

  ${water}

  void main() {
    // Guard every pow(): one NaN pixel is smeared across the frame by bloom.
    vec3 n = vNormal / max(length(vNormal), 1e-5);
    vec3 v = normalize(-vView);
    float fresnel = pow(clamp(1.0 - abs(dot(n, v)), 0.0, 1.0), 2.2);
    // Unstriped species get an even milky band instead.
    float count = mix(uStripes, floor(vStripes + 0.5), uOwnStripes);
    float stripes = count < 0.5
      ? 0.1
      : pow(clamp(0.5 + 0.5 * cos(vAngle * count), 0.0, 1.0), uStripePower);
    float band = smoothstep(0.05, 0.5, vAlong) * (1.0 - smoothstep(0.82, 1.0, vAlong));
    float rim = smoothstep(0.88, 1.0, vAlong);

    // Surface light plays over whatever faces up.
    float sun = smoothstep(-0.2, 0.8, vUp) * caustic(vWorld.xz * 0.11, uTime * 0.6);

    float light = uBase + fresnel * uFresnel + stripes * band * uStripeGain + rim * uRim
      + sun * uCaustic;
    vec3 color = mix(vColor, uTint, uTintMix);
    color = mix(color, vec3(1.0), fresnel * 0.3);
    gl_FragColor = vec4(max(color * light * (1.0 + vGlow * 1.4) * vFade, 0.0), 1.0);
  }
`

export const tentacleVertexShader = /* glsl */ `
  attribute vec3 aColor;
  attribute vec2 aPulse;
  attribute float aGlow;
  // angle around the bell, root radius (1 = rim), length, half width
  attribute vec4 aShape;
  // x: 0 tentacle / 1 oral arm, y: random seed
  attribute vec2 aKind;
  // bell height, rim flare (the strand has to meet the rim it hangs from)
  attribute vec4 aForm;
  // x: how far it swings, y: how tightly it curls (twists, for oral arms)
  attribute vec2 aMotion;

  uniform float uTime;

  varying vec3 vColor;
  varying float vAlong;
  varying float vSide;
  varying float vGlow;
  varying float vFade;
  varying float vKind;
  varying float vEdge;

  ${pulse}

  vec3 strand(float s, float phase) {
    float angle = aShape.x;
    float seed = aKind.y;
    float squeeze = contraction(phase - 1.2);
    vec3 radial = vec3(cos(angle), 0.0, sin(angle));
    vec3 tangent = vec3(-radial.z, 0.0, radial.x);

    float rimRadius = 0.99 * (1.0 + aForm.y) * (1.0 - squeeze * 0.3);
    float rimHeight = -0.1 * aForm.x - squeeze * 0.14;
    float rootHeight = mix(rimHeight, 0.1 * aForm.x, aKind.x);
    vec3 p = radial * rimRadius * aShape.y + vec3(0.0, rootHeight, 0.0);

    float len = aShape.z;
    p.y -= s * len;
    // The squeeze travels down the strand as a wave, at each strand's own pace…
    float reach = sqrt(len) * aMotion.x;
    float pace = 3.5 + seed * 4.5;
    p += radial * sin(phase - s * pace + seed * TAU) * 0.11 * s * reach;
    p += tangent * sin(phase * 0.7 - s * pace * 0.8 + seed * 12.0) * 0.09 * s * reach;
    // …and tentacles coil toward the tip instead of hanging straight.
    float coil = aMotion.y * (1.0 - aKind.x);
    float turn = s * s * coil * 11.0 + seed * TAU + uTime * 0.15;
    p += (radial * cos(turn) + tangent * sin(turn)) * 0.16 * coil * s * s * sqrt(len);
    // …on top of a slow drift in the current.
    p.x += sin(uTime * 0.31 + seed * 20.0 + s * 2.0) * 0.22 * s * s * len;
    p.z += cos(uTime * 0.27 + seed * 31.0 + s * 2.3) * 0.22 * s * s * len;
    // Strands gather inward a little below the bell.
    p.xz *= 1.0 - 0.25 * smoothstep(0.0, 0.5, s) * (1.0 - aKind.x);
    return p;
  }

  void main() {
    float phase = uTime * aPulse.x + aPulse.y;
    float s = position.y;
    float side = position.x;

    mat4 toView = modelViewMatrix * instanceMatrix;
    vec4 mv = toView * vec4(strand(s, phase), 1.0);
    vec4 ahead = toView * vec4(strand(s + 0.02, phase), 1.0);

    // Ribbon faces the camera: widen perpendicular to its on-screen direction.
    vec2 dir = ahead.xy - mv.xy;
    dir = length(dir) > 1e-5 ? normalize(dir) : vec2(0.0, -1.0);
    float scale = length(instanceMatrix[0].xyz);
    float frill = 0.55 + 0.45 * sin(s * 26.0 + aKind.y * 40.0 + phase);
    // Tentacles thin out from a thick root to a hair; oral arms keep their
    // body and twist like ribbon, narrowing whenever they turn edge-on.
    float thin = 0.26 + 0.74 * (1.0 - s) * (1.0 - s);
    float body = 1.0 - s * s * 0.8;
    float twist = cos(s * (5.0 + aMotion.y * 9.0) + aKind.y * TAU + phase * 0.35);
    float facing = mix(1.0, 0.22 + 0.78 * abs(twist), aKind.x);
    float width = aShape.w * scale * mix(thin, body * frill, aKind.x) * facing;
    vEdge = 1.0 - facing;
    mv.xy += vec2(-dir.y, dir.x) * side * width;

    vColor = aColor;
    vAlong = s;
    vSide = side;
    vGlow = aGlow;
    vKind = aKind.x;
    vFade = depthFade(mv.z);
    gl_Position = projectionMatrix * mv;
  }
`

export const tentacleFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlong;
  varying float vSide;
  varying float vGlow;
  varying float vFade;
  varying float vKind;
  varying float vEdge;

  void main() {
    float side2 = vSide * vSide;
    float along = pow(clamp(1.0 - vAlong, 0.0, 1.0), 0.8) * smoothstep(0.0, 0.04, vAlong);
    // Tentacles read as clear tubes: bright walls, a dimmer core, and beads
    // of stinging cells along the length. Oral arms are soft ruffled sheets.
    float tube = smoothstep(1.0, 0.75, abs(vSide)) * (0.35 + 0.65 * side2)
      * (0.7 + 0.3 * sin(vAlong * 90.0));
    float sheet = (1.0 - side2) * (0.75 + 0.25 * sin(vAlong * 34.0 + vSide * 3.0));
    // An edge-on fold shows the same tissue stacked up, so it reads brighter.
    float light = mix(tube * 0.55, sheet * 0.15 * (1.0 + vEdge * 1.6), vKind) * along;
    vec3 color = mix(vColor, vec3(1.0), 0.12);
    gl_FragColor = vec4(color * light * (1.0 + vGlow * 1.4) * vFade, 1.0);
  }
`

export const snowVertexShader = /* glsl */ `
  // x: fall speed, y: size, z: random seed
  attribute vec3 aSeed;

  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uHeight;
  uniform float uMaxSize;

  varying float vAlpha;

  void main() {
    vec3 p = position;
    p.y = mod(p.y - uTime * aSeed.x + uHeight * 0.5, uHeight) - uHeight * 0.5;
    p.x += sin(uTime * 0.2 + aSeed.z * 6.0) * 0.4;
    p.z += cos(uTime * 0.17 + aSeed.z * 9.0) * 0.4;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = min(aSeed.y * (34.0 / -mv.z), uMaxSize) * uPixelRatio;
    // Big ones are out-of-focus specks close to the lens: wide but faint.
    vAlpha = exp(-max(0.0, -mv.z - 4.0) * 0.06)
      * (0.55 + 0.45 * sin(uTime * 0.8 + aSeed.z * 40.0))
      * min(1.0, 2.5 / aSeed.y);
    gl_Position = projectionMatrix * mv;
  }
`

export const snowFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  // 0: soft speck, 1: bubble (a rim and a highlight)
  uniform float uRing;

  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float speck = smoothstep(0.5, 0.0, d);
    float bubble = smoothstep(0.5, 0.44, d) * (0.12 + smoothstep(0.26, 0.44, d))
      + smoothstep(0.1, 0.0, length(gl_PointCoord - vec2(0.36, 0.34)));
    gl_FragColor = vec4(uColor * mix(speck, bubble, uRing) * vAlpha, 1.0);
  }
`

export const seaVertexShader = /* glsl */ `
  varying vec3 vDir;

  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const seaFragmentShader = /* glsl */ `
  uniform float uTime;

  varying vec3 vDir;

  ${water}

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x),
          mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
          mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }

  float murk(vec3 p) {
    float value = 0.0;
    float weight = 0.5;
    for (int octave = 0; octave < 4; octave++) {
      value += noise(p) * weight;
      p = p * 2.03 + 7.1;
      weight *= 0.5;
    }
    return value;
  }

  void main() {
    vec3 dir = normalize(vDir);
    float h = dir.y;

    vec3 abyss = vec3(0.002, 0.008, 0.02);
    vec3 middle = vec3(0.006, 0.04, 0.085);
    vec3 surface = vec3(0.03, 0.2, 0.3);

    vec3 color = mix(abyss, middle, smoothstep(-0.7, 0.15, h));
    color = mix(color, surface, pow(smoothstep(0.0, 1.0, h), 1.7));

    // Shafts of surface light, fanning out from straight above.
    float angle = atan(dir.z, dir.x);
    float shafts = (0.5 + 0.5 * sin(angle * 9.0 + uTime * 0.11))
      * (0.5 + 0.5 * sin(angle * 17.0 - uTime * 0.07 + 1.3))
      * (0.5 + 0.5 * sin(angle * 5.0 + uTime * 0.05));
    color += surface * shafts * smoothstep(0.05, 0.9, h) * 0.8;

    // Water is never evenly clear: slow clouds of murk drift through it.
    float cloud = murk(dir * 2.6 + vec3(uTime * 0.012, uTime * 0.02, 0.0));
    color *= 0.55 + 0.9 * cloud;

    // The surface from below: a rippling window of light straight overhead.
    vec2 overhead = dir.xz / max(h, 0.08);
    float ripple = caustic(overhead * 0.22, uTime * 0.5);
    color += surface * ripple * smoothstep(0.3, 0.95, h) * 1.4;

    float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    color += (grain - 0.5) * 0.004;
    gl_FragColor = vec4(max(color, 0.0), 1.0);
  }
`

// Shafts of light standing in the water itself, so the jellyfish swim through
// them. Each is a ribbon along the light direction, turned to face the camera.
export const shaftVertexShader = /* glsl */ `
  attribute vec3 aOrigin;
  // x: half width, y: length, z: random seed
  attribute vec3 aShaft;

  uniform float uTime;

  varying vec2 vCoord;
  varying float vSeed;

  void main() {
    float side = position.x;
    float along = position.y;
    vec3 light = normalize(vec3(0.22, -1.0, 0.1));

    vec3 origin = aOrigin;
    origin.x += sin(uTime * 0.05 + aShaft.z * 30.0) * 1.5;
    vec4 mv = viewMatrix * vec4(origin + light * aShaft.y * along, 1.0);
    vec3 perp = cross(mat3(viewMatrix) * light, mv.xyz);
    mv.xyz += perp / max(length(perp), 1e-4) * side * aShaft.x * (0.5 + along);

    vCoord = vec2(side, along);
    vSeed = aShaft.z;
    gl_Position = projectionMatrix * mv;
  }
`

export const shaftFragmentShader = /* glsl */ `
  uniform float uTime;

  varying vec2 vCoord;
  varying float vSeed;

  void main() {
    float across = 1.0 - vCoord.x * vCoord.x;
    across *= across;
    float along = smoothstep(0.0, 0.08, vCoord.y)
      * pow(clamp(1.0 - vCoord.y, 0.0, 1.0), 1.5);
    float streak = 0.6 + 0.4 * sin(vCoord.x * 9.0 + vSeed * 50.0 + uTime * 0.2);
    float breathe = 0.5 + 0.5 * sin(uTime * 0.25 + vSeed * 40.0);
    gl_FragColor = vec4(
      vec3(0.22, 0.72, 0.85) * across * along * streak * breathe * 0.075,
      1.0
    );
  }
`

// Looking through water: the image wobbles slightly, colours split toward the
// edges of the frame, and the corners fall into darkness.
export const lensShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;

    varying vec2 vUv;

    void main() {
      vec2 uv = vUv + vec2(
        sin(vUv.y * 17.0 + uTime * 0.7),
        cos(vUv.x * 13.0 + uTime * 0.6)
      ) * 0.0014;
      vec2 centred = uv - 0.5;
      float edge = dot(centred, centred);
      vec2 split = centred * edge * 0.014;

      vec3 color = vec3(
        texture2D(tDiffuse, uv + split).r,
        texture2D(tDiffuse, uv).g,
        texture2D(tDiffuse, uv - split).b
      );
      color *= 1.0 - smoothstep(0.12, 0.6, edge) * 0.55;
      gl_FragColor = vec4(color, 1.0);
    }
  `,
}
