<template>
  <Card>
    <template #content>
      <div class="grid">
        <div class="md:col-4 p-2 bg-bluegray-50 flex justify-content-center">
          <img :src="toAdvertisementImage(ad)" :alt="toAdvertisementName(ad)">
        </div>
        <div class="md:col-8">
          <h3>{{ toAdvertisementName(ad) }}</h3>
          <p class="text-black-alpha-70 break-all">{{ ad }}</p>
        </div>
      </div>
    </template>
    <template #footer>
      <Button @click="emit('adClick', ad)" class="w-full justify-content-center">Find Provider</Button>
    </template>
  </Card>
</template>
<script setup lang="ts">
const props = defineProps<{ ad: string }>();
const emit = defineEmits<{
  (e: 'adClick', ad: string): void,
}>();


function toAdvertisementName(adName: string): string {
  switch (adName.split('#')[1]) {
    case "CreditConsumerAdShape": return 'Private Loan';
    case "CreditEnterpriseAdShape": return 'Business Loan';
    default: return adName;
  }
}

function toAdvertisementImage(adName: string): string {
  switch (adName.split('#')[1]) {
    case "CreditConsumerAdShape": return require('../assets/private-loan-logo.svg');
    case "CreditEnterpriseAdShape": return require('../assets/business-loan-logo.svg');
    default: return require('../assets/logo.png');
  }
}
</script>
