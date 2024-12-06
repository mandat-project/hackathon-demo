<template>
  <Dialog v-model:visible="isVisible" modal header="Redirecting to the AuthApp" center style="width: 50%; margin-top: 2rem; display: block; margin-left: auto; margin-right: auto">
    <p style="margin-bottom: 2rem">Please wait. You will be redirecting to the AuthApp...</p>
  </Dialog>
</template>
<style scoped>
.p-dialog-title {
  text-align: center;
  width: 100%;
}
</style>
<script setup lang="ts">

import {ref, watch} from "vue";

const isVisible = ref(false);

const props = defineProps<{ isVisible: boolean }>();

watch(()=> props.isVisible,()=> {
  isVisible.value = props.isVisible;
}, {immediate:true});
</script>