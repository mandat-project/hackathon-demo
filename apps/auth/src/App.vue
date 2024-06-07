<template>
  <HeaderBar />

  <div v-if="isLoggedIn">
    <router-view />
  </div>
  <Card v-else style="width: 50%; margin-top: 2rem; display: block; margin-left: auto; margin-right: auto;" >
    <template #content>
      <p style="text-align: center;">401 Unauthenticated : Login using the button in the top-right corner!</p>
    </template>
  </Card>

  <Toast
    position="bottom-right"
    :breakpoints="{ '420px': { width: '100%', right: '0', left: '0' } }"
  />
</template>

<script setup lang="ts">
import { HeaderBar } from "@shared/components";
import Toast from "primevue/toast";
import { onSessionRestore } from "@inrupt/solid-client-authn-browser";
import { useSolidSession } from "@shared/composables";
import router from "./router";
import { toRefs } from "vue";
import Card from "primevue/card";

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
