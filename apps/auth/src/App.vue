<template>
  <HeaderBar :isLoggedIn="isLoggedIn" :webId="session.webId" />

  <div v-if="isLoggedIn && session.rdp !== ''">
    <router-view />
  </div>
  <Card v-else style="width: 50%; margin-top: 2rem; display: block; margin-left: auto; margin-right: auto;">
    <template #content>
      <p style="text-align: center;">401 Unauthenticated : Login using the button in the top-right corner!</p>
    </template>
  </Card>

  <Toast position="bottom-right" :breakpoints="{ '420px': { width: '100%', right: '0', left: '0' } }" />
</template>

<script setup lang="ts">
// @ts-ignore no idea what that error is. does not seem to hurt, though
import { HeaderBar } from "@shared/components";
import Toast from "primevue/toast";
import { useSolidProfile, useSolidSession } from "@shared/composables";
import router from "./router";
import { computed } from "vue";
import Card from "primevue/card";


const { session, restoreSession } = useSolidSession();
const { memberOf } = useSolidProfile()
const isLoggedIn = computed(() => {
  return ((session.webId && !memberOf) || (session.webId && memberOf && session.rdp) ? true : false)
})

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

ul,
ol {
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
