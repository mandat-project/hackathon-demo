<template>
  <Card>
    <template #content>
      <div class="grid">
          <div class="md:col-4 p-2 bg-bluegray-50 flex justify-content-center">
            <img class="max-w-full" :src="toAdvertisementImage(ad)" :alt="toAdvertisementName(ad)">
          </div>
          <div class="col-8">
            <h2>{{ toAdvertisementName(ad) }} <a :href="ad" target="_blank" class="no-underline">*</a></h2>
          </div>
        </div>
    </template>
    <template #footer>
      <Button @click="emit('adClick', ad)" class="w-full justify-content-center">Find Provider</Button>
    </template>
  </Card>
</template>
<script setup lang="ts">
import {toAdvertisementImage} from "@/utils/toAdvertisementImage";
import {toAdvertisementName} from "@/utils/toAdvertisementName";

const props = defineProps<{ ad: string }>();
const emit = defineEmits<{
  (e: 'adClick', ad: string): void,
}>();

</script>
