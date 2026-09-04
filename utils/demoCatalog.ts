export type DemoCategoryId = 'learning' | 'vision' | 'spatial' | 'interaction'

export type DemoStatus = 'featured' | 'stable' | 'experimental'

export interface DemoCatalogItem {
  id: string
  category: DemoCategoryId
  icon: string
  to: string
  status: DemoStatus
  tags: string[]
}

export const demoCategories: {
  id: DemoCategoryId
  icon: string
}[] = [
  { id: 'learning', icon: 'i-lucide-graduation-cap' },
  { id: 'vision', icon: 'i-lucide-scan-face' },
  { id: 'spatial', icon: 'i-lucide-box' },
  { id: 'interaction', icon: 'i-lucide-mouse-pointer-2' },
]

export const demoCatalog: DemoCatalogItem[] = [
  {
    id: 'cameraLab',
    category: 'learning',
    icon: 'i-lucide-camera',
    to: '/demo/camera-lab',
    status: 'featured',
    tags: ['Three.js', 'Optics'],
  },
  {
    id: 'math',
    category: 'learning',
    icon: 'i-lucide-chart-spline',
    to: '/demo/math',
    status: 'stable',
    tags: ['SVG', 'WebGL'],
  },
  {
    id: 'python',
    category: 'learning',
    icon: 'i-lucide-terminal-square',
    to: '/demo/python',
    status: 'stable',
    tags: ['Worker', 'Pyodide'],
  },
  {
    id: 'flow',
    category: 'learning',
    icon: 'i-lucide-git-branch',
    to: '/demo/flow',
    status: 'experimental',
    tags: ['Vue Flow'],
  },
  {
    id: 'performer',
    category: 'vision',
    icon: 'i-lucide-person-standing',
    to: '/demo/performer-3d-lab',
    status: 'featured',
    tags: ['MediaPipe', 'Three.js'],
  },
  {
    id: 'puppet',
    category: 'vision',
    icon: 'i-lucide-sparkles',
    to: '/demo/puppet-lab',
    status: 'stable',
    tags: ['Face State', 'Motion'],
  },
  {
    id: 'faceState',
    category: 'vision',
    icon: 'i-lucide-braces',
    to: '/demo/face-state-lab',
    status: 'stable',
    tags: ['Signals'],
  },
  {
    id: 'gaze',
    category: 'vision',
    icon: 'i-lucide-eye',
    to: '/demo/gaze-lab',
    status: 'experimental',
    tags: ['Gaze'],
  },
  {
    id: 'headYaw',
    category: 'vision',
    icon: 'i-lucide-axis-3d',
    to: '/demo/head-yaw-lab',
    status: 'experimental',
    tags: ['Head Pose'],
  },
  {
    id: 'landmarks',
    category: 'vision',
    icon: 'i-lucide-scan-face',
    to: '/demo/face-landmark-lab',
    status: 'experimental',
    tags: ['MediaPipe'],
  },
  {
    id: 'threeRuntime',
    category: 'spatial',
    icon: 'i-lucide-box',
    to: '/demo/threejs',
    status: 'stable',
    tags: ['Vue', 'Three.js'],
  },
  {
    id: 'geo',
    category: 'spatial',
    icon: 'i-lucide-map',
    to: '/demo/geo',
    status: 'experimental',
    tags: ['Three.js', 'GeoJSON'],
  },
  {
    id: 'maptalks',
    category: 'spatial',
    icon: 'i-lucide-map-pinned',
    to: '/demo/maptalks',
    status: 'experimental',
    tags: ['Maptalks'],
  },
  {
    id: 'maplibre',
    category: 'spatial',
    icon: 'i-lucide-plane',
    to: '/demo/maplibre',
    status: 'stable',
    tags: ['MapLibre', 'deck.gl'],
  },
  {
    id: 'scrolls',
    category: 'interaction',
    icon: 'i-lucide-scroll-text',
    to: '/demo/scrolls',
    status: 'experimental',
    tags: ['Scroll'],
  },
  {
    id: 'swiper',
    category: 'interaction',
    icon: 'i-lucide-panels-top-left',
    to: '/demo/swiper',
    status: 'stable',
    tags: ['Web Components'],
  },
]
