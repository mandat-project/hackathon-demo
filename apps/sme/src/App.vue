<template>
  <DacklHeaderBar app-name="Easy Loan" :app-logo="appLogo" :isLoggedIn="isLoggedIn" :webId="session.webId" />

  <div class="px-4 pt-3 bg-gradient-blue">
    <TabList class="mt-4" @item-change="tabListItemChange" :model="tabMenu" :active="routeName" />
  </div>

  <div v-if="isLoggedIn && session.rdp" class="m-1 lg:m-5">
    <router-view />
  </div>
  <UnauthenticatedCard v-else />
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
import {DacklHeaderBar, TabItemType, TabList, UnauthenticatedCard} from "@datev-research/mandat-shared-components";
import {useIsLoggedIn, useServiceWorkerUpdate, useSolidProfile, useSolidSession} from "@datev-research/mandat-shared-composables";
import Button from "primevue/button";
import Toast from "primevue/toast";
import {computed, ref, watch} from "vue";
import {useRoute} from "vue-router";
import router from "./router";

const appLogo = require('@/assets/logo.svg');
const route = useRoute()
const { hasUpdatedAvailable, refreshApp } = useServiceWorkerUpdate();
const isOpen = ref(false);
const routeName = computed<string>(() => `${route.name}`);
const { isLoggedIn } = useIsLoggedIn();
const { session, restoreSession } = useSolidSession();
const { memberOf } = useSolidProfile()

const tabMenu = ref<TabItemType[]>([
  { id: 'create-demand', label: 'Get new Offer' },
  { id: 'demands', label: 'Demands' },
  { id: 'services', label: 'Contracted Services' },
]);

function tabListItemChange(itemId: string) {
  router.push({ name: itemId });
}

watch(hasUpdatedAvailable, () => {
  isOpen.value = hasUpdatedAvailable.value;
});

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
