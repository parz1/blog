<script setup lang="ts">
import { useClipboard } from '@vueuse/core'

const localePath = useLocalePath()
const { t } = useI18n()

// 第一个邮箱（仕事メール）
const source1 = ref('parz1zhou@gmail.com')
const {
  text: text1,
  copy: copy1,
  copied: copied1,
  isSupported: isSupported1,
} = useClipboard({ source: source1 })

// 第二个邮箱（アカデミックメール）
const source2 = ref('zhoulei@g.ecc.u-tokyo.ac.jp')
const {
  text: text2,
  copy: copy2,
  copied: copied2,
  isSupported: isSupported2,
} = useClipboard({ source: source2 })

const handleCopyEmailToClipboard1 = () => copy1()
const handleCopyEmailToClipboard2 = () => copy2()
</script>

<template>
  <div class="flex flex-col justify-center items-center lg:items-start">
    <div class="lg:-ml-2">
      <img
        class="rounded-full w-40 h-40 lg:w-50 lg:h-50 bg-black object-cover object-[52%_38%] transition-shadow shadow-xl hover:shadow-2xl"
        src="~/assets/inDisney.jpg"
        :alt="t('introCard.avatarAlt')"
      />
    </div>
    <!-- <div class="mt-2">
      <span class="text-3xl font-serif">parz1</span>
    </div> -->
    <div
      class="mt-4 mb-0 flex items-center justify-center gap-3 font-serif lg:justify-start"
    >
      <ruby class="ruby-name">
        <span class="text-2xl font-medium">{{
          t('introCard.name.family')
        }}</span>
        <rt class="text-sm font-light">
          {{ t('introCard.name.phoneticFamily') }}
        </rt>
      </ruby>
      <ruby class="">
        <span class="text-2xl font-medium">{{
          t('introCard.name.given')
        }}</span>
        <rt class="text-sm font-light">
          {{ t('introCard.name.phoneticGiven') }}
        </rt>
      </ruby>
    </div>

    <div
      class="mt-2 mb-4 whitespace-pre-line text-center font-serif text-lg leading-relaxed lg:text-left"
    >
      {{ t('introCard.motto') }}
    </div>

    <!-- 仕事メール -->
    <div class="text-sm text-secondary">
      {{ t('introCard.workEmailLabel') }}
    </div>
    <div class="flex items-center -mt-1">
      <div class="underline font-serif">
        <a href="mailto:parz1zhou@gmail.com" @click.stop>
          parz1zhou@gmail.com
        </a>
      </div>
      <UButton
        :icon="copied1 ? 'i-carbon-checkmark' : 'i-carbon-copy'"
        size="xs"
        color="neutral"
        variant="ghost"
        :aria-label="t('introCard.copyEmailAria')"
        @click="handleCopyEmailToClipboard1"
      />
    </div>

    <!-- アカデミックメール -->
    <div class="mt-1 text-sm text-secondary">
      {{ t('introCard.academicEmailLabel') }}
    </div>
    <div class="flex items-center -mt-1">
      <div class="underline font-serif">
        <a href="mailto:zhoulei@g.ecc.u-tokyo.ac.jp" @click.stop>
          zhoulei@g.ecc.u-tokyo.ac.jp
        </a>
      </div>
      <UButton
        :icon="copied2 ? 'i-carbon-checkmark' : 'i-carbon-copy'"
        size="xs"
        color="neutral"
        variant="ghost"
        :aria-label="t('introCard.copyEmailAria')"
        @click="handleCopyEmailToClipboard2"
      />
    </div>

    <div class="text-sm text-secondary mt-4">
      {{ t('introCard.linksTitle') }}
    </div>
    <div class="flex">
      <UPopover mode="hover" :popper="{ placement: 'bottom' }">
        <a href="https://github.com/parz1" target="_blank" @click.stop>
          <UButton
            icon="i-carbon-logo-github"
            color="neutral"
            variant="ghost"
            :aria-label="t('introCard.links.github.ariaLabel')"
          >
            <template #fallback>
              {{ t('introCard.links.github.fallback') }}
            </template>
          </UButton>
        </a>

        <template #content>
          <div class="p-2 text-sm">
            @parz1
            <div class="text-xs mt-1 font-light">
              {{ t('introCard.links.github.tooltip') }}
            </div>
          </div>
        </template>
      </UPopover>
      <UPopover mode="hover" :popper="{ placement: 'bottom' }">
        <a href="https://twitter.com/parz1zhou" target="_blank" @click.stop>
          <UButton
            icon="i-carbon-logo-x"
            color="neutral"
            variant="ghost"
            :aria-label="t('introCard.links.x.ariaLabel')"
          >
            <template #fallback>{{ t('introCard.links.x.fallback') }}</template>
          </UButton>
        </a>

        <template #content>
          <div class="p-2 text-sm">
            @parz1zhou
            <div class="text-xs mt-1 font-light">
              {{ t('introCard.links.x.tooltip') }}
            </div>
          </div>
        </template>
      </UPopover>

      <!-- instgram -->
      <UPopover mode="hover" :popper="{ placement: 'bottom' }">
        <a href="https://www.instagram.com/_parz1/" target="_blank" @click.stop>
          <UButton
            icon="i-carbon-logo-instagram"
            color="neutral"
            variant="ghost"
            :aria-label="t('introCard.links.instagram.ariaLabel')"
          >
            <template #fallback>
              {{ t('introCard.links.instagram.fallback') }}
            </template>
          </UButton>
        </a>

        <template #content>
          <div class="p-2 text-sm">
            @_parz1
            <div class="text-xs mt-1 font-light">
              {{ t('introCard.links.instagram.tooltip') }}
            </div>
          </div>
        </template>
      </UPopover>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@media (min-width: 1024px) {
  .ruby-name {
    ruby-position: over;
    ruby-align: start;
  }
  .ruby-name rt {
    // 使其不能被选中
    user-select: none;
  }
}
</style>
