<template>
  <div class="flex flex-column gap-2">
    <label v-if="label" class="text-sm relative z-1 pl-2 text-black-alpha-70" :for="id">{{ label }}</label>
    <InputText :type="type ? type : 'text'" class="pt-5 -mt-5" :id="id" :value="modelValue" @change="emit('update:modelValue', $event.target.value)" />
  </div>
</template>
<script setup lang="ts">
const props = defineProps<{ type: string; modelValue: string; label: string; }>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void,
}>();

const id = Math.random().toString(32).substring(2);
</script>
<style scoped>
label {
  top: 0.3rem;
}
</style>
