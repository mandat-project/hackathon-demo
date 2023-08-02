<template>

  <HeaderBar/>

  <div class="m-0 lg:m-5">
    <router-view/>
  </div>

  <Dialog header="We updated the App!"
          v-model:visible="isOpen"
          position="bottomright">
    <div>Please save your progress.</div>
    <div>Use the latest version.</div>
    <template #footer>
      <Button label="Update" autofocus @click="reloadApp"/>
    </template>
  </Dialog>

  <Toast position="bottom-right" :breakpoints="{ '420px': { width: '100%', right: '0', left: '0' } }" />

  <ConfirmDialog/>

</template>

<script setup lang="ts">
import {ref, watch} from "vue";
import {HeaderBar} from "@shared/components";
import {useServiceWorkerUpdate} from "@shared/composables";
import Toast from "primevue/toast";

const {hasUpdatedAvailable, refreshApp} = useServiceWorkerUpdate();
const isOpen = ref(false);
watch(hasUpdatedAvailable, () => isOpen.value = hasUpdatedAvailable.value);

function reloadApp() {
  window.location.reload();
}
</script>

<style>
html {
  width: 100vw;
  height: 100vh;
  overscroll-behavior-y: contain;
}

body {
  overscroll-behavior-y: contain;
  margin: 0;
  width: 100%;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  background-color: var(--surface-b);
  font-family: var(--font-family);
  font-weight: 400;
  color: var(--text-color);
}

ul, ol {
  list-style: none;
  padding: 0;
  margin: 0;
}

#app {
  height: 100%;
  width: 100%;
}

.no-tap-highlight {
  -webkit-tap-highlight-color: transparent;
}

/* Track */
::-webkit-scrollbar-track {
  border: none;
}

/* Handle */
::-webkit-scrollbar-thumb {
  background: var(--primary-color);
}

/* Handle on hover */
::-webkit-scrollbar-thumb:hover {
  background: cadetblue;
}

/* PrimeFlex Overrides */
.grid {
  margin: 5px !important;
}
.p-button {
  -webkit-tap-highlight-color: transparent;
}
</style>
