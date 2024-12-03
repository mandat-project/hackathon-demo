<template>
  <div class="grid">
    <div class="col-12">
      <Button label="Zurück" icon="pi pi-arrow-left" class="p-button-text p-button-rounded" @click="router.push('/')"/>
    </div>
    <div class="col lg:col-6 lg:col-offset-3">
      <LDNs />
    </div>
  </div>

</template>

<script setup lang="ts">
import router from "@/router";
import {LDNs} from "hackathon-demo/libs/components";
</script>
