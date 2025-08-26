<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold mb-4">Theme Switcher Test</h1>
    
    <div class="space-y-4">
      <div>
        <h2 class="text-lg font-semibold">Current Theme Info:</h2>
        <p>colorMode.preference: <code class="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{{ colorMode.preference }}</code></p>
        <p>colorMode.value: <code class="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{{ colorMode.value }}</code></p>
        <p>colorMode.unknown: <code class="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{{ colorMode.unknown }}</code></p>
      </div>

      <div>
        <h2 class="text-lg font-semibold">Theme Switcher Component:</h2>
        <ThemeSwitcher />
      </div>

      <div>
        <h2 class="text-lg font-semibold">Manual Theme Controls:</h2>
        <div class="flex gap-2">
          <button 
            @click="colorMode.preference = 'system'"
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            :disabled="colorMode.preference === 'system'"
          >
            Set System
          </button>
          <button 
            @click="colorMode.preference = 'light'"
            class="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            :disabled="colorMode.preference === 'light'"
          >
            Set Light
          </button>
          <button 
            @click="colorMode.preference = 'dark'"
            class="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900"
            :disabled="colorMode.preference === 'dark'"
          >
            Set Dark
          </button>
        </div>
      </div>

      <div>
        <h2 class="text-lg font-semibold">Test Steps:</h2>
        <ol class="list-decimal list-inside space-y-1">
          <li>Note the initial preference (should be 'system')</li>
          <li>Click "Set Light" or "Set Dark"</li>
          <li>Try to click "Set System" or use the ThemeSwitcher dropdown</li>
          <li>Check if you can return to system theme</li>
        </ol>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const colorMode = useColorMode()
</script>