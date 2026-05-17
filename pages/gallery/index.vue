<script setup lang="ts">
import type {
  GalleryCameraMeta,
  GalleryEntry,
  GalleryMedia,
  GalleryOpenEvent,
} from '~/typings/gallery'

type GalleryLocale = 'en' | 'zh-CN' | 'ja'
type GalleryEntryCopyKey =
  | 'cityWires'
  | 'mayFestival'
  | 'kashiwaCampus'
  | 'yakisoba'
  | 'haagenDazs'
  | 'stressed'
type GalleryMediaCopyKey =
  | 'img2787'
  | 'img2927'
  | 'img2881'
  | 'img2736'
  | 'img2820'
  | 'img2723'
type GalleryPageCopy = {
  page: {
    label: string
    title: string
    description: string
  }
  entries: Record<
    GalleryEntryCopyKey,
    {
      title: string
      caption: string
    }
  >
  media: Record<
    GalleryMediaCopyKey,
    {
      alt: string
    }
  >
}
type GalleryEntryRecord = Omit<GalleryEntry, 'caption' | 'media' | 'title'> & {
  copyKey: GalleryEntryCopyKey
  media: GalleryMediaRecord[]
}
type GalleryMediaRecord = Omit<GalleryMedia, 'alt' | 'camera'> & {
  copyKey: GalleryMediaCopyKey
  camera: Omit<GalleryCameraMeta, 'model'>
}

const { locale } = useI18n()

const cameraBase = {
  model: 'iPhone 17 Pro Max',
  lens: 'Main Camera',
  focalLength: '24 mm',
  ev: '0',
  colorProfile: 'Display P3',
  format: 'HEIC',
}

const galleryCopy: Record<GalleryLocale, GalleryPageCopy> = {
  en: {
    page: {
      label: 'Gallery',
      title: 'Copies of world',
      description: 'The lens samples light, time, and order.',
    },
    entries: {
      cityWires: {
        title: 'Circuits in Grey Sky',
        caption: 'The city cuts the sky into nearly straight lines.',
      },
      mayFestival: {
        title: 'Afterlight at the Gate',
        caption:
          'Afternoon turns the Hongo gate into a small segment of still time.',
      },
      kashiwaCampus: {
        title: 'Coordinates in Blue',
        caption: 'The sky reads like an unfinished coordinate system.',
      },
      yakisoba: {
        title: 'Thermodynamics in Foil',
        caption:
          'Heat, salt, and a paper plate reach a brief equilibrium inside foil.',
      },
      haagenDazs: {
        title: 'Vertical Structure of Sugar',
        caption: 'Sugar stacks upward against gravity.',
      },
      stressed: {
        title: 'Noise on the Wrist',
        caption: "The body's signal reaches the screen first.",
      },
    },
    media: {
      img2787: {
        alt: 'Old Tokyo buildings, overhead wires, and a cloudy morning sky.',
      },
      img2927: {
        alt: 'The University of Tokyo gate and brick building in afternoon light.',
      },
      img2881: {
        alt: 'A sunny campus walkway with green trees and a blue sky.',
      },
      img2736: {
        alt: 'Yakisoba served in a foil tray on an outdoor wooden table.',
      },
      img2820: {
        alt: 'A tall Haagen-Dazs parfait with cream, fruit, and ice cream.',
      },
      img2723: {
        alt: 'An Apple Watch showing a stressed mood check-in while riding a train.',
      },
    },
  },
  'zh-CN': {
    page: {
      label: 'Gallery',
      title: 'Copies of world',
      description: '镜头是对光、时间与秩序的取样方式。',
    },
    entries: {
      cityWires: {
        title: '灰天的回路',
        caption: '城市把天空切成若干条近似直线。',
      },
      mayFestival: {
        title: '门前的余光',
        caption: '午后把本乡的门照成一小段静止的时间。',
      },
      kashiwaCampus: {
        title: '一片蓝的坐标',
        caption: '天空像未写完的坐标系。',
      },
      yakisoba: {
        title: '铝箔里的热力学',
        caption: '热量、盐分和纸盘，在铝箔里达成短暂平衡。',
      },
      haagenDazs: {
        title: '糖分的垂直结构',
        caption: '糖分沿着重力向上堆叠。',
      },
      stressed: {
        title: '腕上的噪声',
        caption: '身体的信号先抵达屏幕。',
      },
    },
    media: {
      img2787: {
        alt: '阴天里的东京旧建筑、架空电线和街角。',
      },
      img2927: {
        alt: '午后光线里的东京大学校门和砖色建筑。',
      },
      img2881: {
        alt: '阳光下的校园道路、绿树和蓝天。',
      },
      img2736: {
        alt: '户外木桌上铝箔盒里的炒面。',
      },
      img2820: {
        alt: '一杯堆着奶油、水果和冰淇淋的哈根达斯甜点。',
      },
      img2723: {
        alt: '列车上 Apple Watch 显示压力状态记录。',
      },
    },
  },
  ja: {
    page: {
      label: 'Gallery',
      title: 'Copies of world',
      description: 'レンズは、光と時間と秩序をサンプリングする方法である。',
    },
    entries: {
      cityWires: {
        title: '灰空の回路',
        caption: '都市は空を、いくつかのほぼ直線へ切り分ける。',
      },
      mayFestival: {
        title: '門前の余光',
        caption: '午後が本郷の門を、静止した時間の短い断片にする。',
      },
      kashiwaCampus: {
        title: '青の座標',
        caption: '空はまだ書き終えていない座標系のようだった。',
      },
      yakisoba: {
        title: 'アルミ箔の熱力学',
        caption: '熱、塩分、紙皿が、アルミ箔の中で短い平衡に達する。',
      },
      haagenDazs: {
        title: '糖分の垂直構造',
        caption: '糖分は重力に逆らうように積み上がる。',
      },
      stressed: {
        title: '手首のノイズ',
        caption: '身体の信号は、まず画面に届く。',
      },
    },
    media: {
      img2787: {
        alt: '曇り空の下にある東京の古い建物、架空線、街角。',
      },
      img2927: {
        alt: '午後の光の中にある東京大学の門とレンガ色の建物。',
      },
      img2881: {
        alt: '晴れたキャンパスの歩道、緑の木々、青空。',
      },
      img2736: {
        alt: '屋外の木製テーブルに置かれたアルミ容器入りの焼きそば。',
      },
      img2820: {
        alt: 'クリーム、果物、アイスが重なったハーゲンダッツのパフェ。',
      },
      img2723: {
        alt: '電車内で Apple Watch がストレス状態の記録を表示している。',
      },
    },
  },
}

const entryRecords: GalleryEntryRecord[] = [
  {
    id: 'city-wires',
    copyKey: 'cityWires',
    date: 'May 18, 2026',
    time: '06:27',
    location: 'Tokyo',
    media: [
      {
        id: 'img-2787',
        copyKey: 'img2787',
        title: 'IMG_2787',
        image: '/gallery/IMG_2787-preview.jpg',
        width: 1350,
        height: 1800,
        takenAt: '2026-05-17T21:27:33.000Z',
        camera: {
          aperture: 'f/1.78',
          iso: '80',
          shutter: '1/383 s',
          resolution: '4284 x 5712',
          location: 'Tokyo',
        },
      },
    ],
  },
  {
    id: 'may-festival',
    copyKey: 'mayFestival',
    date: 'May 17, 2026',
    time: '14:33',
    location: 'Hongo',
    media: [
      {
        id: 'img-2927',
        copyKey: 'img2927',
        title: 'IMG_2927',
        image: '/gallery/IMG_2927-preview.jpg',
        liveVideo: '/gallery/IMG_2927-live.mp4',
        width: 1350,
        height: 1800,
        takenAt: '2026-05-17T14:33:39+09:00',
        camera: {
          aperture: 'f/1.78',
          iso: '80',
          shutter: '1/551 s',
          resolution: '4284 x 5712',
          liveDuration: '1.3 s',
          location: 'Hongo',
        },
      },
    ],
  },
  {
    id: 'kashiwa-campus',
    copyKey: 'kashiwaCampus',
    date: 'May 11, 2026',
    time: '12:55',
    location: 'Kashiwa',
    media: [
      {
        id: 'img-2881',
        copyKey: 'img2881',
        title: 'IMG_2881',
        image: '/gallery/IMG_2881-preview.jpg',
        width: 1350,
        height: 1800,
        takenAt: '2026-05-11T12:55:17+09:00',
        camera: {
          aperture: 'f/1.78',
          iso: '80',
          shutter: '1/5714 s',
          resolution: '4284 x 5712',
          location: 'Kashiwa',
        },
      },
    ],
  },
  {
    id: 'yakisoba',
    copyKey: 'yakisoba',
    date: 'April 25, 2026',
    time: '13:04',
    media: [
      {
        id: 'img-2736',
        copyKey: 'img2736',
        title: 'IMG_2736',
        image: '/gallery/IMG_2736-preview.jpg',
        width: 1800,
        height: 1350,
        takenAt: '2026-04-25T13:04:10+09:00',
        camera: {
          aperture: 'f/1.78',
          iso: '80',
          shutter: '1/943 s',
          resolution: '5712 x 4284',
        },
      },
    ],
  },
  {
    id: 'haagen-dazs',
    copyKey: 'haagenDazs',
    date: 'May 5, 2026',
    time: '20:05',
    media: [
      {
        id: 'img-2820',
        copyKey: 'img2820',
        title: 'IMG_2820',
        image: '/gallery/IMG_2820-preview.jpg',
        width: 1350,
        height: 1800,
        takenAt: '2026-05-05T20:05:32+09:00',
        camera: {
          aperture: 'f/1.78',
          iso: '250',
          shutter: '1/50 s',
          resolution: '4284 x 5712',
        },
      },
    ],
  },
  {
    id: 'stressed',
    copyKey: 'stressed',
    date: 'April 23, 2026',
    time: '17:24',
    media: [
      {
        id: 'img-2723',
        copyKey: 'img2723',
        title: 'IMG_2723',
        image: '/gallery/IMG_2723-preview.jpg',
        width: 1350,
        height: 1800,
        takenAt: '2026-04-23T17:24:47+09:00',
        camera: {
          aperture: 'f/2.2',
          iso: '320',
          shutter: '1/105 s',
          resolution: '3024 x 4032',
        },
      },
    ],
  },
]

const activeCopy = computed(() => {
  const key = locale.value as GalleryLocale

  return galleryCopy[key] ?? galleryCopy.en
})

const pageCopy = computed(() => activeCopy.value.page)

const entries = computed<GalleryEntry[]>(() =>
  entryRecords.map((entry) => {
    const copy = activeCopy.value.entries[entry.copyKey]

    return {
      id: entry.id,
      title: copy.title,
      date: entry.date,
      time: entry.time,
      location: entry.location,
      caption: copy.caption,
      media: entry.media.map(({ camera, copyKey, ...media }) => ({
        ...media,
        alt: activeCopy.value.media[copyKey].alt,
        camera: {
          ...cameraBase,
          ...camera,
        },
      })),
    }
  }),
)

const activeSelection = ref<GalleryOpenEvent | null>(null)

const openLightbox = (payload: GalleryOpenEvent) => {
  activeSelection.value = payload
}

const closeLightbox = () => {
  activeSelection.value = null
}

useHead({
  title: () => pageCopy.value.title,
})
</script>

<template>
  <main class="gallery-page min-h-[calc(100vh-7rem)] px-4 py-9 sm:px-6">
    <GalleryTimeline
      :entries="entries"
      :label="pageCopy.label"
      :title="pageCopy.title"
      :description="pageCopy.description"
      @open="openLightbox"
    />

    <GalleryLightbox
      v-if="activeSelection"
      :entry="activeSelection.entry"
      :media="activeSelection.media"
      :media-index="activeSelection.mediaIndex"
      :source-rect="activeSelection.sourceRect"
      @close="closeLightbox"
    />
  </main>
</template>

<style scoped>
.gallery-page {
  background:
    linear-gradient(
      to right,
      color-mix(in srgb, var(--ui-border) 34%, transparent) 1px,
      transparent 1px
    ),
    linear-gradient(
      to bottom,
      color-mix(in srgb, var(--ui-border) 28%, transparent) 1px,
      transparent 1px
    ),
    var(--ui-bg);
  background-size:
    48px 48px,
    48px 48px,
    auto;
}
</style>
