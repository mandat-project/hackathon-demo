import { reactive, computed } from "vue";
import { ISessionInfo, Session } from "@inrupt/solid-client-authn-browser";

console.log()

const session = reactive(new Session());
const sessionInfo = reactive({
  sessionId: session.info.sessionId,
  isLoggedIn: false,
  webId: undefined,
} as ISessionInfo);

// restorePreviousSession -> onSessionRestore((url) => { router.push(url) }); // to set user to current page and not initial page
session.handleIncomingRedirect({ url: window.location.href, restorePreviousSession: true }).then((info) => {
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

/**
 * Login :)
 */
async function login(idp: string) {
  if (!session.info.isLoggedIn) {
    await session.login({
      oidcIssuer: idp , // eg "https://inrupt.net"
      redirectUrl: window.location.href,
    });
  }
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
    // session, // no reactive !!!
    authFetch,
    login,
    logout,
    sessionInfo,
  };
};
