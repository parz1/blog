export type SurfaceId = 'book' | 'kraft' | 'cotton' | 'foil'
export type PrintMode = 'blank' | 'type' | 'pattern'

export const materialSamples: {
  id: SurfaceId
  number: string
  shader: number
}[] = [
  { id: 'book', number: '01', shader: 0 },
  { id: 'kraft', number: '02', shader: 1 },
  { id: 'cotton', number: '03', shader: 2 },
  { id: 'foil', number: '04', shader: 3 },
]

export const materialVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

// All noise is fixed in surface coordinates: moving the light never moves the grain.
// The foil is a designed optical approximation, not a diffraction simulation.
export const materialFragmentShader = `
  uniform float uSurface;
  uniform float uTexture;
  uniform float uLight;
  uniform float uSeed;
  uniform float uOutput;
  uniform vec4 uLayers; // fibers, relief, lighting, spectrum
  uniform float uGrooves;
  uniform vec2 uTilt;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p + uSeed * 0.137, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 cell = floor(p);
    vec2 f = fract(p);
    vec2 s = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(cell), hash(cell + vec2(1.0, 0.0)), s.x),
      mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0)), s.x), s.y);
  }
  float paperHeight(vec2 p) {
    float fine = noise(p * vec2(220.0, 300.0));
    float tooth = noise(p * vec2(75.0, 100.0));
    float broad = noise(p * 16.0);
    return fine * 0.3 + tooth * 0.5 + broad * 0.2;
  }
  float fibers(vec2 p) {
    vec2 grid = p * vec2(95.0, 38.0);
    vec2 cell = floor(grid);
    vec2 f = fract(grid) - 0.5;
    float seed = hash(cell);
    f.x += f.y * (seed - 0.5) * 1.4;
    float width = 0.018 + seed * 0.03;
    float strand = (1.0 - smoothstep(width, width + 0.028, abs(f.x)))
      * (1.0 - smoothstep(0.16, 0.48, abs(f.y)));
    return strand * smoothstep(0.58, 0.82, seed);
  }
  vec3 spectrum(float phase) {
    return 0.52 + 0.38 * cos(6.283185 * (phase + vec3(0.0, 0.33, 0.67)));
  }
  void main() {
    vec2 p = vUv;
    vec3 light = normalize(vec3(cos(uLight) * 0.9, sin(uLight) * 0.9, 1.2));
    vec3 viewNormal = normalize(vec3(uTilt.y * 0.8, -uTilt.x * 0.8, 1.0));
    float grain = noise(p * vec2(440.0, 600.0));
    float broad = noise(p * vec2(12.0, 16.0));
    vec3 color;
    vec3 base;
    vec3 pigment;
    vec3 surfaceNormal = vec3(0.0, 0.0, 1.0);
    float height = 0.5;
    float diffuse = 1.0;
    float grooveMap = 0.5;
    vec3 rainbow = vec3(0.0);
    vec3 highlights = vec3(0.0);

    if (uSurface < 2.5) {
      float kraft = step(0.5, uSurface) * (1.0 - step(1.5, uSurface));
      float cotton = step(1.5, uSurface);
      base = mix(vec3(0.91, 0.865, 0.755), vec3(0.55, 0.335, 0.15), kraft);
      base = mix(base, vec3(0.925, 0.90, 0.835), cotton);
      float rawHeight = paperHeight(p);
      float relief = mix(0.4, 1.65, cotton) * uTexture * uLayers.y;
      height = 0.5 + (rawHeight - 0.5) * uLayers.y * min(uTexture, 1.8);
      float dx = paperHeight(p + vec2(0.0012, 0.0)) - rawHeight;
      float dy = paperHeight(p + vec2(0.0, 0.0012)) - rawHeight;
      surfaceNormal = normalize(vec3(-dx, -dy, 0.0) * relief * 5.0 + vec3(0.0, 0.0, 1.0));
      vec3 normal = normalize(viewNormal + vec3(surfaceNormal.xy, 0.0));
      diffuse = max(0.0, dot(normal, light));
      float strand = fibers(p);
      float fleck = smoothstep(0.72, 0.88, noise(p * vec2(170.0, 225.0)));
      pigment = base;
      pigment += ((grain - 0.5) * 0.048 + (broad - 0.5) * 0.042) * uTexture * uLayers.x;
      pigment -= strand * mix(0.025, 0.16, kraft) * uTexture * uLayers.x;
      pigment -= fleck * kraft * 0.10 * uTexture * uLayers.x;
      color = pigment * mix(1.0, 0.81 + diffuse * 0.24, uLayers.z);
    } else {
      base = vec3(0.57, 0.59, 0.62);
      vec3 reflected = reflect(-light, viewNormal);
      float facing = max(0.0, dot(viewNormal, light));
      float phase = p.x * 1.6 + p.y * 0.85 + uTilt.y * 0.8
        - uTilt.x * 0.6 + facing * 1.1 + uLight * 0.12;
      rainbow = spectrum(phase);
      float grooves = sin((p.x * 0.7 + p.y) * 1550.0 + broad * 2.0);
      grooveMap = 0.5 + grooves * 0.5 * uGrooves * min(uTexture, 1.0);
      float facets = noise(p * vec2(48.0, 64.0));
      float sparkle = pow(max(0.0, cos(facets * 55.0 + phase * 12.0)), 36.0)
        * smoothstep(0.72, 0.95, hash(floor(p * vec2(160.0, 210.0))));
      float shine = pow(max(0.0, reflected.z), 24.0);
      float band = pow(max(0.0, 1.0 - abs(p.x * 0.7 + p.y * 0.3
        - 0.5 - uTilt.y * 0.35 + uTilt.x * 0.2)), 16.0);
      highlights = (vec3(sparkle * 0.20 * uTexture) + vec3(0.40) * shine + vec3(0.28) * band) * uLayers.z;
      pigment = mix(base, rainbow, (0.64 + 0.14 * uTexture) * uLayers.w);
      color = pigment * mix(1.0, 0.68 + facing * 0.30, uLayers.z);
      color += grooves * 0.018 * uTexture * uGrooves + highlights;
    }
    // Data maps use direct display values, without color conversion or decoration.
    if (uOutput > 2.5 && uOutput < 6.5) {
      vec3 data = vec3(clamp(height, 0.0, 1.0));
      if (uOutput > 3.5) data = surfaceNormal * 0.5 + 0.5;
      if (uOutput > 4.5) data = vec3(mix(1.0, diffuse, uLayers.z));
      if (uOutput > 5.5) data = vec3(grooveMap);
      gl_FragColor = vec4(data, 1.0);
      return;
    }
    if (uOutput > 0.5 && uOutput < 1.5) color = base;
    if (uOutput > 1.5 && uOutput < 2.5) color = pigment;
    if (uOutput > 6.5 && uOutput < 7.5) color = pigment;
    if (uOutput > 7.5) color = highlights;
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`
