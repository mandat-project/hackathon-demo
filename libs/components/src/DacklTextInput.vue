<template>
  <div class="flex flex-column gap-2">
    <label
      v-if="label"
      class="text-sm relative z-1 pl-2 text-black-alpha-70"
      :for="id"
      >{{ label }}</label
    >
    <InputText
      :inputmode="type === 'number' ? 'numeric' : 'text'"
      class="pt-5 -mt-5"
      :id="id"
      :value="modelValue"
      :style =" { backgroundColor: backgroundColor }"
      :disabled="disabled"
      @keyup="update($event.target.value)"
    />
    <span v-show="error" class="text-red-500">Ungültige Eingabe</span>
  </div>
</template>
<script setup lang="ts">
import {ref, watch} from "vue";

const props = defineProps<{
  type: string;
  modelValue: string;
  label: string;
  disabled: boolean;
}>();
const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();
const error = ref<boolean>(false);

const backgroundColor = ref('white');
watch(
    () => props.disabled,
    (newValue) => {
      backgroundColor.value = newValue ? 'rgba(237, 240, 243, 1)' : 'white';
    },
    { immediate: true } // Run the watcher immediately on component mount
);
const id = Math.random().toString(32).substring(2);

function update(value: string): void {
  if (props.type === "number") {
    const isValidNumber = !Number.isNaN(Number(value));
    error.value = !isValidNumber;
    // Do not emit invalid values
    if (error.value) {
      return;
    }

    emit("update:modelValue", `${Number(value)}`);
    return;
  }
  emit("update:modelValue", value);
}
</script>
<style scoped>
label {
  top: 0.3rem;
}
</style>
