<script lang="ts">
import {
  useServiceWorkerNotifications,
  useSolidProfile,
  useSolidSession,
  useSolidWebPush,
} from "@datev-research/mandat-shared-composables";
import { computed, defineComponent, ref, toRefs } from "vue";
import LoginButton from "./LoginButton.vue";
import LogoutButton from "./LogoutButton.vue";
import { useToast } from "primevue/usetoast";
import BadgeDirective from "primevue/badgedirective";

export default defineComponent({
  name: "HeaderBar",
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
  },
  setup() {
    const { hasActivePush, askForNotificationPermission } =
      useServiceWorkerNotifications();
    const { subscribeForResource, unsubscribeFromResource } = useSolidWebPush();
    const { session } = useSolidSession();
    const { name, img, inbox } = useSolidProfile();
    // const { ldns } = useSolidInbox();
    const toast = useToast();

    // const inboxBadge = computed(() => ldns.value.length);

    // const isToggling = ref(false);
    // const togglePush = async () => {
    //   toast.add({
    //     severity: "error",
    //     summary: "Web Push Unavailable!",
    //     detail:
    //       "The service is currently offline, but will be available again!",
    //     life: 5000,
    //   });
    // return ;
    //   isToggling.value = true;
    //   const hasPermission = (await askForNotificationPermission()) == "granted";
    //   if (!hasPermission) {
    //     // toast to let the user know that the need to change the permission in the browser bar
    //     isToggling.value = false;
    //     return;
    //   }
    //   if (inbox.value == "") {
    //     // toast to let the user know that we could not find an inbox
    //     isToggling.value = false;
    //     return;
    //   }
    //   if (hasActivePush.value) {
    //     // currently subscribed -> unsub
    //     return unsubscribeFromResource(inbox.value).finally(
    //       () => (isToggling.value = false)
    //     );
    //   }
    //   if (!hasActivePush.value) {
    //     // currently not subbed -> sub
    //     return subscribeForResource(inbox.value).finally(
    //       () => (isToggling.value = false)
    //     );
    //   }
    // };
    // return { inboxBadge, img, isToggling, hasActivePush, name, togglePush };
    return { img, hasActivePush, name };
  },
});
</script>

<template>
  <div class="header">
    <Toolbar>
      <template #start>
        <!-- <router-link to="/inbox/"> -->
        <!-- <div v-if="inboxBadge === 0" class="flex align-items-center"> -->
        <div class="flex align-items-center">
          <Avatar
            v-if="isLoggedIn"
            shape="circle"
            style="border: 2px solid var(--primary-color)"
          >
            <img v-if="img && isLoggedIn" :src="img" />
            <i v-if="!img && isLoggedIn" class="pi pi-user" />
          </Avatar>
        </div>
        <!-- <div v-else>
            <Avatar v-if="isLoggedIn" shape="circle" v-badge="inboxBadge">
              <img v-if="img && isLoggedIn" :src="img" />
              <i v-if="!img && isLoggedIn" class="pi pi-user" />
            </Avatar>
          </div> -->
        <!-- </router-link> -->
        <a
          v-if="webId"
          :href="webId"
          class="no-tap-highlight hidden sm:inline-block ml-2"
        >
          <span>{{ name }}</span>
        </a>
        <Divider v-if="webId" layout="vertical" />
        <div v-if="webId" class="nav-button">Demands</div>
      </template>
      <template #end>
        <Button
          v-if="isLoggedIn"
          class="p-button-rounded p-button-text ml-1 mr-1 no-tap-highlight"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="none"
            viewBox="0 0 20 20"
          >
            <path
              fill="#003D66"
              fill-opacity=".9"
              d="M6 6H2V2h4v4Zm6-4H8v4h4V2Zm6 0h-4v4h4V2ZM6 8H2v4h4V8Zm6 0H8v4h4V8Zm6 0h-4v4h4V8ZM6 14H2v4h4v-4Zm6 0H8v4h4v-4Zm6 0h-4v4h4v-4Z"
            />
            <path
              fill="#61C7F2"
              d="M5 5H3V3h2v2Zm6-2H9v2h2V3Zm6 0h-2v2h2V3ZM5 9H3v2h2V9Zm6 0H9v2h2V9Zm6 0h-2v2h2V9ZM5 15H3v2h2v-2Zm6 0H9v2h2v-2Zm6 0h-2v2h2v-2Z"
            />
          </svg>
        </Button>
        <Button
          v-if="isLoggedIn"
          class="p-button-rounded p-button-text ml-1 mr-1 no-tap-highlight"
          :class="{ 'p-button-secondary': !hasActivePush }"
        >
          <!-- :class="{ 'p-button-secondary': !hasActivePush }" :loading="isToggling"> -->
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="none"
            viewBox="0 0 20 20"
          >
            <path
              fill="#633200"
              fill-opacity=".9"
              d="M10 1c-.83 0-1.5.654-1.5 1.464v.664C5.64 3.791 4 5.994 4 9v6l-2 1.044V17h6a2 2 0 1 0 4 0h6v-.956L16 15V9c0-2.996-1.63-5.209-4.5-5.873v-.663C11.5 1.654 10.83 1 10 1Z"
            />
            <path
              fill="#FFD746"
              d="M15.537 15.887 15 15.606V9c0-2.927-1.621-5.073-5-5.073S5 6.072 5 9v6.606l-.537.28-.218.114H15.755l-.218-.113Z"
            />
          </svg>
        </Button>
        <Button
          v-if="isLoggedIn"
          class="p-button-rounded p-button-text ml-1 mr-1 no-tap-highlight"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="none"
            viewBox="0 0 20 20"
          >
            <path
              fill="#00451D"
              fill-opacity=".9"
              d="M10 1a9 9 0 0 0-9 9 9 9 0 0 0 9 9 9 9 0 0 0 9-9 9 9 0 0 0-9-9Z"
            />
            <path fill="#52B812" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
            <path
              fill="#fff"
              d="M8.723 12.461c-.047-.13-.09-.3-.125-.508a3.618 3.618 0 0 1-.055-.617c0-.317.063-.605.19-.863a3.52 3.52 0 0 1 .478-.723c.19-.224.396-.44.617-.648.22-.208.427-.411.617-.609s.349-.406.477-.625c.128-.219.19-.458.19-.719 0-.234-.046-.438-.14-.613a1.28 1.28 0 0 0-.387-.438 1.745 1.745 0 0 0-.563-.262 2.53 2.53 0 0 0-.674-.086c-.776 0-1.516.347-2.22 1.039V4.984c.855-.5 1.74-.75 2.657-.75.422 0 .82.055 1.195.164.375.109.703.271.984.484.28.213.503.479.664.797.16.318.242.688.242 1.109 0 .401-.067.758-.203 1.07a3.932 3.932 0 0 1-.512.863 4.92 4.92 0 0 1-.664.699c-.237.203-.458.406-.664.609a3.435 3.435 0 0 0-.512.633 1.35 1.35 0 0 0-.203.727 2 2 0 0 0 .086.609c.058.182.114.336.172.461H8.723v.002ZM9.613 15.766c-.297 0-.56-.102-.789-.305a.949.949 0 0 1-.328-.734c0-.297.11-.542.328-.734.224-.208.487-.313.79-.313.296 0 .557.104.78.313a.934.934 0 0 1 .328.734.949.949 0 0 1-.328.734 1.145 1.145 0 0 1-.78.305Z"
            />
          </svg>
        </Button>
        <LoginButton v-if="!isLoggedIn" />
        <LogoutButton v-else />
      </template>
    </Toolbar>
  </div>
  <div style="height: 75px" id="header-bar-spacer" />
</template>

<style scoped>
.header {
  background: linear-gradient(90deg, #195b78 0%, #287f8f 100%);
  padding: 1.5rem;
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  border: 0;
  z-index: 2;
}

.nav-button {
  background-color: rgba(65, 132, 153, 0.2);
  color: rgba(0, 0, 0, 0.9);
  border-radius: 7px;
  font-weight: 600;
  line-height: 1.5rem;
  padding: 0.7rem;
  margin: -0.3rem;
}

.p-toolbar-group-left span {
  margin-left: 0.5rem;
  max-width: 59.5vw;
  overflow: hidden;
  text-overflow: ellipsis;
}

.p-toolbar-group-left .p-avatar {
  width: 2rem;
  height: 2rem;
}

.p-toolbar-group-left a {
  color: inherit;
  /* blue colors for links too */
  text-decoration: inherit;
  /* no underline */
}
</style>
