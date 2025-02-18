<script setup lang="ts"></script>

<template>
  <div class="p-4 md:px-[20%] lg:pr-[20%] lg:pl-4">
    <p class="indent-4">
      初めてウェブサイトを作成したのは、小学校5年生の時でした。大学入学前には、何度かACMコンテストに挑戦し、大学ではデジタルメディア技術を専攻いたしました。在学中より実務的な開発に携わるようになり、その後、ご縁があって浙江安宣信息技术有限公司にて取締役を務めさせていただいております。主に技術選定やモジュール開発を担当し、日々研鑽を積んでおります。また、クロスプラットフォーム開発やWeb開発を深く研究しつつ、GISやWebGLにも触れ、その知見を広げております。
    </p>
    <div class="flex flex-col lg:flex-row gap-2 mt-2">
      <div class="lg:w-1/3">
        <div class="font-bold text-lg">留学を選んだ道</div>
        <p class="indent-4">
          一番の理由は、このままでは成長が停滞してしまうという危機感を抱いたことです。現在の環境では、自身の成長が横ばいになりつつあり、技術を体系的に理解し、その本質を深く追求したいという強い関心を持っています。
        </p>
        <p class="indent-4">
          もう一つの理由は、弊社の技術が十分にモジュール化されており、私が不在でも開発業務に支障が出ない状態になっていることです。また、事業が安定期に入った今、無理な拡大は研究力の不足による大きなリスクを伴うため、より深く学ぶことが最善の選択だと考えています。
        </p>
      </div>

      <div class="lg:flex-grow h-80 lg:h-auto">
        <DemoMapTokyo />
      </div>
    </div>
    <div class="mt-4">
      <GradientTitle title="サンプル" subtitle="開発について" />

      <div class="font-bold text-lg">CrossPlatform</div>
      <div class="font-bold text-lg">PVZ(create.js)</div>
    </div>
    <div class="mt-4">
      <GradientTitle title="ツール" subtitle="私が使っています" />
      <div class="">
        <div>
          <div class="text-xl mb-0">I build apps mainly with</div>
          <div
            class="hidden lg:flex h-[6.5rem] gap-1 p-2 border-2 border-dashed rounded-md dark:bg-gray-800"
          >
            <TechIcon name="javascript" size="5rem" icon="/svg/javascript-color.svg" />
            <!-- <img class="w-10 h-10" src="/svg/typescript-color.svg" alt="typescript" /> -->
            <div class="flex flex-col gap-1 flex-wrap">
              <TechIcon name="typescript" size="2.4rem" icon="/svg/typescript-color.svg" />
              <!-- node -->
              <TechIcon name="nodejs" size="2.4rem" icon="/svg/nodedotjs-color.svg" />
              <TechIcon name="C" size="2.4rem" icon="/svg/c-color.svg" />
              <!-- node -->
              <TechIcon name="C++" size="2.4rem" icon="/svg/cplusplus-color.svg" />
              <!-- rust -->
              <TechIcon name="rust" size="2.4rem" icon="/svg/rust-color.svg" />
            </div>
            <div class="px-4 flex flex-col justify-center">...</div>
            <UDivider label="Framworks" orientation="vertical" />
            <div class="h-full flex flex-col gap-1 flex-wrap ml-4">
              <TechIcon name="vuejs" size="2.4rem" icon="/svg/vuedotjs-color.svg" />
              <TechIcon name="nuxtjs" size="2.4rem" icon="/svg/nuxtdotjs-color.svg" />
              <!-- react -->
              <TechIcon name="react" size="2.4rem" icon="/svg/react-color.svg" />
              <TechIcon name="react native" size="2.4rem" icon="/svg/react-native-color.svg" />
              <TechIcon name="electron" size="2.4rem" icon="/svg/electron-color.svg" />
              <TechIcon name="nestjs" size="2.4rem" icon="/svg/nestjs.svg" />
              <TechIcon name="tailwindcss" size="2.4rem" icon="/svg/tailwindcss-color.svg" />
              <TechIcon name="unity" size="2.4rem" icon="/svg/unity.svg" />
              <TechIcon name="vite" size="2.4rem" icon="/svg/vite-color.svg" />
              <TechIcon name="webpack" size="2.4rem" icon="/svg/webpack-color.svg" />
              <TechIcon name="rollup" size="2.4rem" icon="/svg/rollupdotjs-color.svg" />
              <TechIcon name="turborepo" size="2.4rem" icon="/svg/turborepo-color.svg" />
              <div class="h-full px-4 flex flex-col justify-center">...</div>
            </div>
            <UDivider label="Tools" orientation="vertical" />
            <div class="h-full flex flex-col gap-1 flex-wrap ml-4">
              <!-- vscode -->
              <TechIcon name="vscode" size="2.4rem" icon="/svg/visualstudiocode-color.svg" />
              <TechIcon name="arc browser" size="2.6rem" icon="/svg/arc-logo.svg" />
            </div>
          </div>

          <div class="lg:hidden flex gap-1 p-2 border-2 border-dashed rounded-md dark:bg-gray-800">
            <TechIcon name="javascript" size="4rem" icon="/svg/javascript-color.svg" />
            <!-- <img class="w-10 h-10" src="/svg/typescript-color.svg" alt="typescript" /> -->

            <TechIcon name="typescript" size="4rem" icon="/svg/typescript-color.svg" />
            <!-- node -->
            <TechIcon name="nodejs" size="4rem" icon="/svg/nodedotjs-color.svg" />
            <TechIcon name="C" size="4rem" icon="/svg/c-color.svg" />
            <!-- node -->
            <TechIcon name="C++" size="4rem" icon="/svg/cplusplus-color.svg" />
            <!-- rust -->
            <TechIcon name="rust" size="4rem" icon="/svg/rust-color.svg" />
          </div>
          <div class="font-bold text-lg mt-2">Frameworks</div>
          <div
            class="lg:hidden flex h-[6.8rem] p-2 border-2 border-dashed rounded-md dark:bg-gray-800"
          >
            <div class="h-full flex flex-col gap-2 flex-wrap">
              <TechIcon name="vuejs" size="2.4rem" icon="/svg/vuedotjs-color.svg" />
              <TechIcon name="nuxtjs" size="2.4rem" icon="/svg/nuxtdotjs-color.svg" />
              <!-- react -->
              <TechIcon name="react" size="2.4rem" icon="/svg/react-color.svg" />
              <TechIcon name="react native" size="2.4rem" icon="/svg/react-native-color.svg" />
              <TechIcon name="electron" size="2.4rem" icon="/svg/electron-color.svg" />
              <TechIcon name="nestjs" size="2.4rem" icon="/svg/nestjs.svg" />
              <TechIcon name="tailwindcss" size="2.4rem" icon="/svg/tailwindcss-color.svg" />
              <TechIcon name="unity" size="2.4rem" icon="/svg/unity.svg" />
              <TechIcon name="vite" size="2.4rem" icon="/svg/vite-color.svg" />
              <TechIcon name="webpack" size="2.4rem" icon="/svg/webpack-color.svg" />
              <TechIcon name="rollup" size="2.4rem" icon="/svg/rollupdotjs-color.svg" />
              <TechIcon name="turborepo" size="2.4rem" icon="/svg/turborepo-color.svg" />
              <div class="h-full px-4 flex flex-col justify-center">...</div>
            </div>

            <div class="h-full flex flex-col gap-1 flex-wrap ml-4">
              <!-- vscode -->
              <TechIcon name="vscode" size="2.4rem" icon="/svg/visualstudiocode-color.svg" />
              <TechIcon name="arc browser" size="2.6rem" icon="/svg/arc-logo.svg" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-4">
      <GradientTitle title="ブログ" subtitle="技術ログ" />
      <PostsPreview />
    </div>
  </div>
</template>

<style scope></style>
