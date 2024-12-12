<script lang="ts">
import {
  useServiceWorkerNotifications,
  useSolidProfile,
} from "@datev-research/mandat-shared-composables";
import BadgeDirective from "primevue/badgedirective";
import { defineComponent } from "vue";
import LoginButton from "./LoginButton.vue";
import LogoutButton from "./LogoutButton.vue";

export default defineComponent({
  name: "AuthAppHeaderBar",
  components: {
    LoginButton,
    LogoutButton,
  },
  directives: {
    badge: BadgeDirective,
  },
  props: {
    isLoggedIn: Boolean,
    webId: String,
    appLogo: String,
  },
  setup() {
    const { hasActivePush } = useServiceWorkerNotifications();
    const { name, img } = useSolidProfile();
    const appName = "Authorization App";
    return { img, hasActivePush, appName, name };
  },
});
</script>

<template>
  <div class="header-container shadow-2 p-4 fixed top-0 left-0 right-0 z-2">
    <Toolbar>
      <template #start>
        <img v-if="appLogo" :src="appLogo" :alt="appName" />
        <a href="/" class="no-underline text-900 ml-2">
          <span>{{ appName }}</span>
        </a>
      </template>
      <template #end>
        <a
          v-if="webId"
          :href="webId"
          class="no-tap-highlight no-underline text-900 gap-2 flex align-items-center justify-content-end"
        >
          <span
            class="white-space-nowrap overflow-hidden text-overflow-ellipsis hidden sm:inline w-5 md:w-auto"
            >{{ name }}</span
          >
          <Avatar v-if="isLoggedIn" shape="circle" class="border-1">
            <img v-if="img" :src="img" />
            <i v-else class="pi pi-user" />
          </Avatar>
        </a>
        <LoginButton v-if="!isLoggedIn" />
        <LogoutButton v-else />
      </template>
    </Toolbar>
  </div>
  <div class="h-5rem" />
</template>

<style scoped>
.header-container {
  background-image: linear-gradient(
    to right,
    var(--shared-auth-app-header-bar-background-color-from, var(--surface-100)),
    var(--shared-auth-app-header-bar-background-color-to, var(--surface-100))
  );
}
</style>
