<template>
  <div>Show Access Request {{ uri }}</div>
  <div>on Authorize redirect to {{ `${redirect}?uri=${uri}&result=1` }}</div>
</template>

<script setup lang="ts">
defineProps(["uri", "redirect"]);
</script>
