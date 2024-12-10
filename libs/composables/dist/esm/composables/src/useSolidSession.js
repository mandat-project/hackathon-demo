import { inject, reactive } from "vue";
import { RdpCapableSession } from "./rdpCapableSession";
let session;
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
    };
};
