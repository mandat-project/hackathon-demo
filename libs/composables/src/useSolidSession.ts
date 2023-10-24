import { computed, reactive } from "vue";
import {
  ISessionInfo,
  getDefaultSession,
} from "@inrupt/solid-client-authn-browser";

const session = reactive(getDefaultSession());
const sessionInfo = reactive({
  sessionId: session.info.sessionId,
  isLoggedIn: false,
  webId: undefined,
} as ISessionInfo);

/**
 * Login :)
 */
async function login(idp: string) {
  if (!session.info.isLoggedIn) {
    await session.login({
      oidcIssuer: idp, // eg "https://inrupt.net"
      redirectUrl: window.location.href,
    });
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
function restoreSession() {
  session
    .handleIncomingRedirect({
      url: window.location.href,
      restorePreviousSession: true,
    })
    .then((info) => {
      if (info) {
        sessionInfo.sessionId = info.sessionId;
        sessionInfo.isLoggedIn = info.isLoggedIn;
        sessionInfo.webId = info.webId;
      } else {
        sessionInfo.sessionId = session.info.sessionId;
        sessionInfo.isLoggedIn = false;
        sessionInfo.webId = undefined;
      }
    });
}

/**
 * Logout :()
 */
async function logout() {
  session.logout().then(() => {
    sessionInfo.sessionId = session.info.sessionId;
    sessionInfo.isLoggedIn = false;
    sessionInfo.webId = undefined;
  });
}

const authFetch = computed(() => {
  return sessionInfo.isLoggedIn ? session.fetch : undefined;
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
