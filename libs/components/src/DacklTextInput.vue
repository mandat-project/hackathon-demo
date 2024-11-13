<template>
  <div class="flex flex-column gap-2">
    <label v-if="label" class="text-sm relative z-1 pl-2 text-black-alpha-70" :for="id">{{ label }}</label>
    <InputText :inputmode="type === 'number' ? 'numeric' : 'text'" class="pt-5 -mt-5" :id="id" :value="modelValue" :style =" { backgroundColor: backgroundColor }" :disabled="disabled" @keyup="emit('update:modelValue', $event.target.value)" />
  </div>
</template>
<script setup lang="ts">
import {ref, watch} from "vue";

const props = defineProps<{ type: string; modelValue: string | number; label: string; disabled: boolean }>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void,
}>();
const backgroundColor = ref('white');

watch(
    () => props.disabled,
    (newValue) => {
      backgroundColor.value = newValue ? 'rgba(237, 240, 243, 1)' : 'white';
    },
    { immediate: true } // Run the watcher immediately on component mount
);

const id = Math.random().toString(32).substring(2);
</script>
<style scoped>
label {
  top: 0.3rem;
}
</style>
