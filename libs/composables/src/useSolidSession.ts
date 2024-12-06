import {Session} from "hackathon-demo/libs/solid";
import {inject, reactive, UnwrapNestedRefs} from "vue";
import {RdpCapableSession} from "./rdpCapableSession";

interface IuseSolidSessoin {
  session: RdpCapableSession;
  restoreSession: () => Promise<void>;
}

let session: UnwrapNestedRefs<Session>;

async function restoreSession() {
  await session.handleRedirectFromLogin();
}
/**
 * Auto-re-login / and handle redirect after login
 * 
 * Use in App.vue like this
 * ```ts
    // plain (without any routing framework)
    restoreSession()
    // but if you use a router, make sure it is ready
    router.isReady().then(restoreSession)
   ```
 */

export const useSolidSession = () => {
  session ??= inject('useSolidSession:RdpCapableSession', () => reactive(new RdpCapableSession("")), true);

  return {
    session,
    restoreSession,
  } as IuseSolidSessoin;
};
