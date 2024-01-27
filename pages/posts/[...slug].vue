<template>
  <main>
    <p>ROUTE: {{ $route.params.dirs }} - {{ $route.params.slug }}</p>

    <ContentDoc>
      <template #empty>
        <h1>Document is empty</h1>
      </template>
    </ContentDoc>
  </main>
</template>
