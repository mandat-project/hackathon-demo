<script setup lang="ts">
import { useDateFormat } from "@vueuse/core";

const props = defineProps<{
  format?: string;
  datetimeString: string;
}>();

const formatted = useDateFormat(
  props.datetimeString,
  props.format ?? "DD.MM.YYYY HH:mm:ss",
  { locales: "de-DE" }
);
</script>

<template>{{ formatted }}</template>
