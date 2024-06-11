import { computed, reactive } from "vue";
import { Session } from "@shared/solid";

const session = reactive(new Session());
const sessionInfo = reactive({
  isLoggedIn: session.isActive,
  webId: session.webid,
});

/**
 * Login :)
 */
async function login(idp: string) {
  if (!session.isActive) {
    await session.login(idp, window.location.href);
    sessionInfo.isLoggedIn = session.isActive;
    sessionInfo.webId = session.webid;
  }
}

/**
 * Auto-re-login
 * 
 * Use in App.vue like this
 * ```ts
    // bring user back to the current location
    onSessionRestore((url) =>
      router.push(`/${url.split("://")[1].split("/")[1]}`)
    );
    // re-use Solid session
    useSolidSession().restoreSession();
   ```
 */
async function restoreSession() {
  await session.handleRedirectFromLogin();
  sessionInfo.isLoggedIn = session.isActive;
  sessionInfo.webId = session.webid;
}

/**
 * Logout :()
 */
async function logout() {
  await session.logout();
  sessionInfo.isLoggedIn = session.isActive;
  sessionInfo.webId = session.webid;
}

const authFetch = computed(() => {
  return session.isActive ? session.fetch : undefined;
});

export const useSolidSession = () => {
  return {
    authFetch,
    login,
    restoreSession,
    logout,
    sessionInfo,
  };
};
