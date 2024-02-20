<template>
  <HeaderBar />

  <div v-if="isLoggedIn" class="m-0 lg:m-5">
    <router-view />
  </div>
  <span v-else>
    401 Unauthenticated : Login using the button in the top-right corner!
  </span>

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

// bring user back to the current location
onSessionRestore((url) => router.push(`/${url.split("://")[1].split("/")[1]}`));
// re-use Solid session
useSolidSession().restoreSession();
// check if logged in
const { sessionInfo } = useSolidSession();
const { isLoggedIn } = toRefs(sessionInfo);
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;

}
</style>
