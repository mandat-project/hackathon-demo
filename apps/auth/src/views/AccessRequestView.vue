<template>
  <div>{{ uri }}</div>
  <div>{{ redirect }}</div>
</template>

<script setup lang="ts">
const props = defineProps(["uri", "redirect"]);
</script>
