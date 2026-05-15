<script setup lang="ts">
const activeTitle = ref('')
const activeYoutubeID = ref('')
</script>

<template>
  <div class="p-4 md:px-[12%] md:w-screen lg:w-176 lg:pl-4 lg:pr-0">
    <p class="indent-4">
      初めてウェブサイトを作成したのは、小学校5年生の時でした。大学入学前には、何度かACMコンテストに挑戦し、大学ではデジタルメディア技術を専攻いたしました。在学中より実務的な開発に携わるようになり、その後、ご縁があってとある会社にて取締役を務めさせていただいております。主に技術選定やモジュール開発を担当し、日々研鑽を積んでおります。また、クロスプラットフォーム開発やWeb開発を深く研究しつつ、GISやWebGLにも触れ、その知見を広げております。
    </p>
    <div class="flex flex-col lg:flex-row gap-2 mt-2">
      <div class="lg:w-[16rem]">
        <div class="font-bold text-xl mb-2">留学を選んだ道</div>
        <p class="indent-4">
          一番の理由は、このままでは成長が停滞するという危機感を抱いたからです。現在の環境では成長が横ばいになりつつあり、技術を体系的に学び、その本質を深く追求したいと考えました。
        </p>

        <p class="indent-4">
          加えて、弊社の技術が十分にモジュール化され、私が不在でも開発に支障が出ない状態になっていることです。事業が安定期に入った今、無理な拡大は研究力の不足によるリスクが大きいため、専門性を深めることが最善の選択だと判断しました。
        </p>
      </div>

      <div class="lg:grow h-80 lg:h-auto">
        <DemoMapTokyo />
      </div>
    </div>
    <div class="mt-4">
      <!-- <GradientTitle title="ツール" subtitle="私が使っています" /> -->
      <div class="text-xl font-bold mb-2 mt-6">ツール</div>
      <div class="hidden lg:block">
        <div>
          <div class="text-xl mb-0">I build apps mainly with</div>
          <div class="flex flex-wrap justify-start gap-1">
            <div
              class="w-58 h-full tech-item p-2 border-2 border-dashed rounded-md dark:bg-gray-800"
            >
              <div class="h-22 flex gap-2">
                <TechIcon
                  name="javascript"
                  size="5rem"
                  icon="/svg/javascript-color.svg"
                />
                <!-- <img class="w-10 h-10" src="/svg/typescript-color.svg" alt="typescript" /> -->
                <div class="h-full flex flex-col gap-1 flex-wrap">
                  <TechIcon
                    name="typescript"
                    size="2.4rem"
                    icon="/svg/typescript-color.svg"
                  />
                  <!-- node -->
                  <TechIcon
                    name="nodejs"
                    size="2.4rem"
                    icon="/svg/nodedotjs-color.svg"
                  />
                  <TechIcon name="C" size="2.4rem" icon="/svg/c-color.svg" />
                  <!-- node -->
                  <TechIcon
                    name="C++"
                    size="2.4rem"
                    icon="/svg/cplusplus-color.svg"
                  />
                  <!-- rust -->
                  <TechIcon
                    name="rust"
                    size="2.4rem"
                    icon="/svg/rust-color.svg"
                  />
                </div>
              </div>
              Languages
            </div>

            <div
              class="w-68 h-full tech-item p-2 border-2 border-dashed rounded-md dark:bg-gray-800"
            >
              <div class="h-22 flex gap-2">
                <div class="h-full flex flex-col gap-1 flex-wrap">
                  <TechIcon
                    name="vuejs"
                    size="2.4rem"
                    icon="/svg/vuedotjs-color.svg"
                  />
                  <TechIcon
                    name="nuxtjs"
                    size="2.4rem"
                    icon="/svg/nuxtdotjs-color.svg"
                  />
                  <!-- react -->
                  <TechIcon
                    name="react"
                    size="2.4rem"
                    icon="/svg/react-color.svg"
                  />
                  <TechIcon
                    name="react native"
                    size="2.4rem"
                    icon="/svg/react-native-color.svg"
                  />
                  <TechIcon
                    name="electron"
                    size="2.4rem"
                    icon="/svg/electron-color.svg"
                  />
                  <TechIcon
                    name="nestjs"
                    size="2.4rem"
                    icon="/svg/nestjs.svg"
                  />
                  <TechIcon
                    name="tailwindcss"
                    size="2.4rem"
                    icon="/svg/tailwindcss-color.svg"
                  />
                  <TechIcon name="unity" size="2.4rem" icon="/svg/unity.svg" />
                  <TechIcon
                    name="vite"
                    size="2.4rem"
                    icon="/svg/vite-color.svg"
                  />
                  <TechIcon
                    name="webpack"
                    size="2.4rem"
                    icon="/svg/webpack-color.svg"
                  />
                  <TechIcon
                    name="rollup"
                    size="2.4rem"
                    icon="/svg/rollupdotjs-color.svg"
                  />
                  <TechIcon
                    name="turborepo"
                    size="2.4rem"
                    icon="/svg/turborepo-color.svg"
                  />
                </div>
              </div>
              Frameworks
            </div>
            <div
              class="w-40 h-full tech-item p-2 border-2 border-dashed rounded-md dark:bg-gray-800"
            >
              <div class="h-22 flex gap-2">
                <div class="h-full flex flex-col gap-1 flex-wrap">
                  <!-- vscode -->
                  <TechIcon
                    name="vscode"
                    size="2.4rem"
                    icon="/svg/visualstudiocode-color.svg"
                  />
                  <TechIcon
                    name="arc browser"
                    size="2.6rem"
                    icon="/svg/arc-logo.svg"
                  />
                  <TechIcon
                    name="android studio"
                    size="2.4rem"
                    icon="/svg/androidstudio-color.svg"
                  />
                  <TechIcon
                    name="docker"
                    size="2.4rem"
                    icon="/svg/docker-color.svg"
                  />
                  <TechIcon
                    name="postman"
                    size="2.4rem"
                    icon="/svg/postman-color.svg"
                  />
                  <TechIcon
                    name="warp"
                    size="2.4rem"
                    icon="/svg/warp-color.svg"
                  />
                </div>
              </div>
              Tools
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="mt-4">
      <!-- <GradientTitle title="作ってきたもの" subtitle="What I've done" /> -->
      <div class="text-xl font-bold mb-2 mt-6">作ってきたもの</div>
      <div class="text-lg">
        CrossPlatform（PC/モバイル向けプロジェクトアーキテクチャ）
      </div>
      <!-- https://g.imgtg.com/uploads/7247/67d7f4e842b70.png -->
      <img
        class="w-full"
        src="https://g.imgtg.com/uploads/7247/67d7f9af4b97d.png"
        alt="CrossPlatform"
      />
      <div class="text-lg mt-4">Projects</div>

      <DemoSwiperElement
        container-class="hidden md:block h-64 w-full p-4"
        element-class=""
        :data="[
          {
            id: 'Qz2o3qFEDCc',
            title: 'Web対応の3Dインタラクティブマーケット',
            coverUrl: 'https://g.imgtg.com/uploads/7247/67d91aa543bbf.png',
          },
          {
            id: 'wBHVMHtBVXY',
            title: 'Web対応の3Dインタラクティブマーケット',
            coverUrl: 'https://g.imgtg.com/uploads/7247/67d91b22756be.png',
          },
          {
            id: 'poErMe8IEwg',
            title: 'AI搭載スマートレジスケール',
            coverUrl: 'https://g.imgtg.com/uploads/7247/67d931db0b0fd.png',
          },
        ]"
        :options="{
          effect: 'cube',
          loop: true,
          autoplay: { delay: 5000 },
          navigation: true,
          pagination: { clickable: true },
        }"
      >
        <template #default="{ data }">
          <UModal
            :title="data.title"
            :close="{
              color: 'primary',
              variant: 'outline',
              class: 'rounded-full',
            }"
          >
            <div
              :style="{
                backgroundImage: `url(${data.coverUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }"
              alt="cover"
              class="h-full w-full object-cover cursor-pointer"
              @click="((activeYoutubeID = data.id), (activeTitle = data.title))"
            >
              <div
                class="w-full h-full transition-all flex justify-center items-center text-lg text-white"
              >
                <div class="bg-black bg-opacity-50 p-2 rounded-md">
                  {{ data.title }}
                </div>
              </div>
            </div>

            <template #body>
              <div class="p-0">
                <iframe
                  :key="activeYoutubeID"
                  tabindex="-1"
                  class="h-64 w-full"
                  :src="`https://www.youtube.com/embed/${activeYoutubeID}`"
                  allowfullscreen
                  referrerpolicy="no-referrer"
                ></iframe>
              </div>
            </template>
          </UModal>
        </template>
      </DemoSwiperElement>
      <div class="flex gap-1"></div>
      <!-- <div class="text-lg mt-4">AI搭載スマートレジスケール</div> -->
      <!-- <iframe
        class="w-full"
        src="https://www.youtube.com/embed/poErMe8IEwg"
        allowfullscreen
        referrerpolicy="no-referrer"
      ></iframe> -->
      <!-- <div class="text-lg mt-4">PVZ(create.js)</div> -->
    </div>

    <div class="mt-4">
      <!-- <GradientTitle title="ブログ" subtitle="技術ログ" /> -->
      <div class="text-xl font-bold mt-6 mb-4">ブログ</div>
      <PostsPreview />
    </div>
  </div>
</template>

<style scope>
.flex-wrap-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: center;
}
.tech-item {
  grow: 0; /* 避免 Safari 计算错误 */
  shrink: 0;
  justify-items: center;
  text-align: center;
}
</style>
