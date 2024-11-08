<script lang="ts">
import { computed, defineComponent, ref, toRefs } from "vue";
import LoginButton from "./LoginButton.vue";
import LogoutButton from "./LogoutButton.vue";
import {
  useServiceWorkerNotifications,
  // useSolidInbox,
  useSolidProfile,
  useSolidSession,
  useSolidWebPush
} from "@shared/composables";
import { useToast } from "primevue/usetoast";
import BadgeDirective from "primevue/badgedirective";

export default defineComponent({
  name: 'HeaderBar',
  components: {
    LoginButton, LogoutButton
  },
  directives: {
    'badge': BadgeDirective
  },
  props: {
    isLoggedIn: Boolean,
    webId: String,
    appLogo: String,
    appName: String,
  },
  setup() {

    const {hasActivePush} =
        useServiceWorkerNotifications();
    const {name, img} = useSolidProfile();
    return {img, hasActivePush, name}
  }
})
</script>

<template>
  <div class="bg-gradient-blue p-4 absolute top-0 left-0 right-0 z-2 background">
    <Toolbar>
      <template #start>
        <img class="h-2rem w-2rem" v-if="appLogo" :src="appLogo" :alt="appName"/>
        <a href="/" class="no-underline text-900 ml-2">
          <span>{{ appName }}</span>
        </a>
      </template>
      <template #end>
        <a v-if="webId" :href="webId"
           class="no-tap-highlight no-underline text-900 gap-2 flex align-items-center justify-content-end">
          <span class="white-space-nowrap overflow-hidden text-overflow-ellipsis hidden sm:inline w-5 md:w-auto">{{ name }}</span>
          <Avatar v-if="isLoggedIn" shape="circle" class="border-1">
            <img v-if="img" :src="img"/>
            <i v-else class="pi pi-user"/>
          </Avatar>
        </a>
        <LoginButton v-if="!isLoggedIn"/>
        <LogoutButton v-else/>
      </template>
    </Toolbar>
  </div>
  <div class="h-5rem"/>
</template>

<style scoped>
</style>
