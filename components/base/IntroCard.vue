<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
const source = ref('parz1zhou@gmail.com')
const { text, copy, copied, isSupported } = useClipboard({ source })
const handleCopyEmailToClipboard = () => {
  copy()
}
const source2 = ref('parzivor@gmail.com')
const { text2, copy2, copied2, isSupported2 } = useClipboard({ source2 })
const handleCopyEmailToClipboard2 = () => {
  copy2()
}
</script>

<template>
  <div class="flex flex-col justify-center items-center lg:items-start">
    <div class="">
      <img
        class="w-20 h-20 md:w-40 md:h-40 bg-black transition-shadow hover:shadow-xl"
        src="~/assets/avatar.png"
        alt="avatar"
      />
    </div>
    <div class="mt-0">
      <span class="text-4xl font-bold">parz1</span>
    </div>
    <div class="mt-4 mb-0">
      <div class="text-sm flex justify-start items-center gap-2">
        <div>シュウ</div>
        <div>ライ</div>
      </div>
      <div class="text-xl flex justify-start items-center gap-8">
        <div>周</div>
        <div>磊</div>
      </div>
    </div>

    <div class="mb-4 text-sm">物に喜ばず、己に悲しまず。</div>

    <!-- <div class="text-sm">['aivə]</div> -->
    <div class="text-sm text-gray-400">仕事メール</div>
    <div class="flex items-center mt-[-0.5rem]">
      <div class="underline">
        <a href="mailto:parz1zhou@gmail.com" @click.stop> parz1zhou@gmail.com </a>
      </div>
      <UButton
        :icon="copied ? 'i-carbon-checkmark' : 'i-carbon-copy'"
        size="xs"
        color="gray"
        variant="ghost"
        aria-label="Theme"
        @click="handleCopyEmailToClipboard"
      />
    </div>

    <div class="text-sm text-gray-400">アカデミックメール</div>
    <div class="flex items-center mt-[-0.5rem]">
      <div class="underline">
        <a href="mailto:parz1zhou@gmail.com" @click.stop> parzivor@gmail.com </a>
      </div>
      <UButton
        :icon="copied2 ? 'i-carbon-checkmark' : 'i-carbon-copy'"
        size="xs"
        color="gray"
        variant="ghost"
        aria-label="Theme"
        @click="handleCopyEmailToClipboard2"
      />
    </div>

    <div class="text-gray-500 mt-4">Links</div>
    <div class="flex">
      <UPopover mode="hover" :popper="{ placement: 'bottom' }">
        <a href="https://github.com/parz1" target="_blank" @click.stop>
          <UButton icon="i-carbon-logo-github" color="gray" variant="ghost" aria-label="Theme">
            <template #fallback>GitHub</template>
          </UButton>
        </a>

        <template #panel>
          <div class="p-2 text-sm">
            @parz1
            <div class="text-xs mt-1 font-light">
              Click icon to <span class="font-bold">GitHub</span>
            </div>
          </div>
        </template>
      </UPopover>
      <UPopover mode="hover" :popper="{ placement: 'bottom' }">
        <a href="https://twitter.com/parz1zhou" target="_blank" @click.stop>
          <UButton icon="i-carbon-logo-x" color="gray" variant="ghost" aria-label="Theme">
            <template #fallback>X</template>
          </UButton>
        </a>

        <template #panel>
          <div class="p-2 text-sm">
            @parz1zhou
            <div class="text-xs mt-1 font-light">
              Click icon to <span class="font-bold">X</span>
            </div>
          </div>
        </template>
      </UPopover>

      <!-- instgram -->
      <UPopover mode="hover" :popper="{ placement: 'bottom' }">
        <a href="https://www.instagram.com/_parz1/" target="_blank" @click.stop>
          <UButton icon="i-carbon-logo-instagram" color="gray" variant="ghost" aria-label="Theme">
            <template #fallback>Instagram</template>
          </UButton>
        </a>

        <template #panel>
          <div class="p-2 text-sm">
            @_parz1
            <div class="text-xs mt-1 font-light">
              Click icon to <span class="font-bold">Instagram</span>
            </div>
          </div>
        </template>
      </UPopover>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
