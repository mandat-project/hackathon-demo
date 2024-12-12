<template>
  <Card>
    <template #content>
      <div class="grid m-0">
          <div class="md:col-4 p-2 bg-bluegray-50 flex justify-content-center"  style="width: 112px; height: 112px;">
            <img class="max-w-full" :src="toAdvertisementImage(ad)" :alt="toAdvertisementName(ad)">
          </div>
          <div class="col-8">
            <h2><a :href="ad" target="_blank" class="no-underline">{{ toAdvertisementName(ad) }} *</a></h2>
          </div>
        </div>
      <HorizontalLine class="mt-0"/>
    </template>
    <template #footer>
      <Button @click="emit('adClick', ad)" class="w-full justify-content-center">Find Provider</Button>
    </template>
  </Card>
</template>
<script setup lang="ts">
import {toAdvertisementImage} from "@/utils/toAdvertisementImage";
import {toAdvertisementName} from "@/utils/toAdvertisementName";
import {HorizontalLine} from "@datev-research/mandat-shared-components";

const props = defineProps<{ ad: string }>();
const emit = defineEmits<{
  (e: 'adClick', ad: string): void,
}>();

</script>
<style scoped>
.p-card :deep(.p-card-content) {
  padding-top: 0;
  padding-bottom: 0;
}
.p-card :deep(.p-card-footer) {
  padding-top: 0;
}
</style>