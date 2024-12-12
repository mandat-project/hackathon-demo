<template>
  <Dialog
    :visible="props.isVisible"
    center
    header="Redirecting to the AuthApp"
    modal
    class="w-auto mt-4 mx-auto block"
  >
    <p class="mb-5 mt-0">
      Please wait. You will be redirected to the AuthApp...
    </p>
  </Dialog>
</template>
<style scoped>
.p-dialog-title {
  text-align: center;
  width: 100%;
}
</style>
<script setup lang="ts">
const props = defineProps<{ isVisible: boolean }>();
</script>
