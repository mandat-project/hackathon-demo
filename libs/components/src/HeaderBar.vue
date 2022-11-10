<script setup lang="ts">
import {computed, ref, toRefs} from "vue";
import LoginButton from "./LoginButton.vue";
import LogoutButton from "./LogoutButton.vue";
import {
  useServiceWorkerNotifications,
  useSolidInbox,
  useSolidProfile,
  useSolidSession,
  useSolidWebPush
} from "@shared/composables";
import {useToast} from "primevue/usetoast";

const {hasActivePush, askForNotificationPermission} =
    useServiceWorkerNotifications();
const {subscribeForResource, unsubscribeFromResource} = useSolidWebPush();
const {sessionInfo} = useSolidSession();
const {isLoggedIn, webId} = toRefs(sessionInfo);
const {name, img, inbox} = useSolidProfile();
const {ldns} = useSolidInbox();

const toast = useToast();

const inboxBadge = computed(() => ldns.value.length);

const isToggling = ref(false);
const togglePush = async () => {
  toast.add({
    severity: "error",
    summary: "Web Push Unavailable!",
    detail:
        "The service is currently offline, but will be available again!",
    life: 5000,
  });
  return;
  isToggling.value = true;
  const hasPermission = (await askForNotificationPermission()) == "granted";
  if (!hasPermission) {
    // toast to let the user know that the need to change the permission in the browser bar
    isToggling.value = false;
    return;
  }
  if (inbox.value == "") {
    // toast to let the user know that we could not find an inbox
    isToggling.value = false;
    return;
  }
  if (hasActivePush.value) {
    // currently subscribed -> unsub
    return unsubscribeFromResource(inbox.value).finally(
        () => (isToggling.value = false)
    );
  }
  if (!hasActivePush.value) {
    // currently not subbed -> sub
    return subscribeForResource(inbox.value).finally(
        () => (isToggling.value = false)
    );
  }
};
</script>

<template>
  <div>
    <Toolbar>
      <template #start>
        <router-link to="/inbox/">
          <div v-if="inboxBadge === 0">
            <Avatar v-if="isLoggedIn" shape="circle" style="border: 2px solid var(--primary-color)">
              <img v-if="img && isLoggedIn" :src="img"/>
              <i v-if="!img && isLoggedIn" class="pi pi-user"/>
            </Avatar>
          </div>
          <div v-else>
            <Avatar v-if="isLoggedIn" shape="circle" v-badge="inboxBadge">
              <img v-if="img && isLoggedIn" :src="img"/>
              <i v-if="!img && isLoggedIn" class="pi pi-user"/>
            </Avatar>
          </div>
        </router-link>
        <a
            v-if="webId"
            :href="webId"
            class="no-tap-highlight hidden sm:inline-block ml-2"
        >
          <span>{{ name }}</span>
        </a>
      </template>
      <template #end>
        <Button
            v-if="isLoggedIn"
            icon="pi pi-bell"
            class="p-button-rounded p-button-text mr-4 no-tap-highlight"
            :class="{ 'p-button-secondary': !hasActivePush }"
            :loading="isToggling"
            @click="togglePush"
        />
        <LoginButton v-if="!isLoggedIn"/>
        <LogoutButton v-else/>
      </template>
    </Toolbar>
    <div style="height: 75px"/>
  </div>
</template>

<style scoped>
.p-toolbar {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  height: 75px;
  border: 0;
  box-shadow: 0 0 10px -5px black;
  z-index: 1;
}

.p-toolbar-group-left span {
  margin-left: 10px;
  margin-right: 10px;
  font-size: 150%;
  max-width: 59.5vw;
  overflow: hidden;
  text-overflow: ellipsis;
}

.p-toolbar-group-left .p-avatar {
  width: 2.357rem;
  height: 2.357rem;
}

.p-toolbar-group-left a {
  color: inherit; /* blue colors for links too */
  text-decoration: inherit; /* no underline */
}
</style>
