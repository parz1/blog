<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
const source = ref('parz1zhou@gmail.com')
const { text, copy, copied, isSupported } = useClipboard({ source })
const handleCopyEmailToClipboard = () => {
  copy()
}
</script>

<template>
  <div class="flex flex-col justify-center items-center">
    <div>
      <img
        class="w-20 h-20 md:w-40 md:h-40 bg-black transition-shadow hover:shadow-xl"
        src="~/assets/avatar.png"
        alt="avatar"
      />
    </div>
    <div class="mt-4">
      <span class="text-3xl font-extralight"><span class="text-3xl font-medium">parz1</span></span>
    </div>
    <div>周 磊</div>
    <!-- <div class="text-sm">['aivə]</div> -->

    <div>parz1zhou@gmail.com</div>

    <UButton color="gray" variant="ghost" aria-label="Theme" @click="handleCopyEmailToClipboard">
      <UIcon :name="copied ? 'i-carbon-checkmark' : 'i-carbon-copy'" dynamic />
    </UButton>
    <div class="flex items-center">
      <UPopover mode="hover" :popper="{ placement: 'right' }">
        <!-- 支持划词 -->
        <div class="mb-2 text-lg">parz1zhou@gmail.com</div>
        <template #panel>
          <div class="p-2 text-sm">
            <div>
              <a href="mailto:parz1zhou@gmail.com" @click.stop>
                <UButton color="gray" variant="ghost" aria-label="Theme">
                  <UIcon name="i-carbon-email" />
                  Email with default mail client
                </UButton>
              </a>
            </div>
            <div>
              <UButton
                color="gray"
                variant="ghost"
                aria-label="Theme"
                @click="handleCopyEmailToClipboard"
              >
                <UIcon :name="copied ? 'i-carbon-checkmark' : 'i-carbon-copy'" dynamic />
                {{ copied ? 'Copied!' : 'Copy to clipboard' }}
              </UButton>
            </div>
          </div>
        </template>
      </UPopover>
    </div>

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
