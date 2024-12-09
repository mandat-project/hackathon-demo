<template>
  <Card>
    <template #content>
      <div class="grid">
          <div class="md:col-4 p-2 bg-bluegray-50 flex justify-content-center">
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
import {HorizontalLine} from "@shared/components";

const props = defineProps<{ ad: string }>();
const emit = defineEmits<{
  (e: 'adClick', ad: string): void,
}>();

</script>
