<template>
  <link rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/github-fork-ribbon-css/0.2.3/gh-fork-ribbon.min.css" />
  <DacklHeaderBar app-name="Tax Service" :app-logo="appLogo" :isLoggedIn="isLoggedIn" :webId="session.webId" :background-color="backgroundColor" />

  <div v-if="isLoggedIn && session.rdp !== ''" class="m-5">
    <router-view />
  </div>

  <UnauthenticatedCard v-else/>
  <Dialog header="We updated the App!" v-model:visible="isOpen" position="bottomright">
    <div>Please save your progress.</div>
    <div>Use the latest version.</div>
    <template #footer>
      <Button label="Update" autofocus @click="refreshApp" />
    </template>
  </Dialog>

  <Toast position="bottom-right" :breakpoints="{ '420px': { width: '100%', right: '0', left: '0' } }" />

  <ConfirmDialog />
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Toast from "primevue/toast";
import { useServiceWorkerUpdate, useSolidProfile, useSolidSession } from "@datev-research/mandat-shared-composables";
import {DacklHeaderBar, UnauthenticatedCard} from "@datev-research/mandat-shared-components";
import router from "./router";

const appLogo = require('@/assets/logo.png');
const { hasUpdatedAvailable, refreshApp } = useServiceWorkerUpdate();
const isOpen = ref(false);
watch(hasUpdatedAvailable, () => {
  isOpen.value = hasUpdatedAvailable.value;
});
const { session, restoreSession } = useSolidSession();
const { memberOf } = useSolidProfile()
const isLoggedIn = computed(() => {
  return ((session.webId && !memberOf) || (session.webId && memberOf && session.rdp) ? true : false)
})

const backgroundColor = ref("linear-gradient(90deg, #6d0d85, #c76dde)");
// re-use Solid session
router.isReady().then(restoreSession)

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

/* App-Container */
#app {
  height: 100%;
  width: 100%;
}

/* PrimeVue / PrimeFlex Overrides */
.grid {
  margin: 5px !important;
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
</style>
