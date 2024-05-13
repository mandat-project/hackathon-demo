<template>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-fork-ribbon-css/0.2.3/gh-fork-ribbon.min.css" />
  <HeaderBar />
  
  <div v-if="isLoggedIn" class="m-0 lg:m-5">
    <router-view />
  </div>
  <span v-else>
    401 Unauthenticated : Login using the button in the top-right corner!
  </span>

  <!-- This div is a buffer area for the bottom navigation tool (speeddial or other) -->
  <div style="height: 75px" />

  <Dialog
    header="We updated the App!"
    v-model:visible="isOpen"
    position="bottomright"
  >
    <div>Please save your progress.</div>
    <div>Use the latest version.</div>

    <template #footer>
      <Button label="Update" autofocus @click="refreshApp" />
    </template>
  </Dialog>

  <Toast
    position="bottom-right"
    :breakpoints="{ '420px': { width: '100%', right: '0', left: '0' } }"
  />

  <ConfirmDialog />
</template>

<script lang="ts" setup>
import { ref, toRefs, watch } from "vue";
import { HeaderBar } from "@shared/components";
import { useServiceWorkerUpdate, useSolidSession } from "@shared/composables";
import Toast from "primevue/toast";
import { onSessionRestore } from "@inrupt/solid-client-authn-browser";
import router from "./router";

const { hasUpdatedAvailable, refreshApp } = useServiceWorkerUpdate();
const isOpen = ref(false);
watch(hasUpdatedAvailable, () => {
  isOpen.value = hasUpdatedAvailable.value;
});
// bring user back to the current location
onSessionRestore((url) => router.push(`/${url.split("://")[1].split("/")[1]}`));
// re-use Solid session
useSolidSession().restoreSession();
// check if logged in
const { sessionInfo } = useSolidSession();
const { isLoggedIn } = toRefs(sessionInfo);
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

#app {
  height: 100%;
  width: 100%;
}

.no-tap-highlight {
  -webkit-tap-highlight-color: transparent;
}

.p-button {
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
</style>
