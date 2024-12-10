import { RdpCapableSession } from "./rdpCapableSession";
interface IuseSolidSessoin {
    session: RdpCapableSession;
    restoreSession: () => Promise<void>;
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
export declare const useSolidSession: () => IuseSolidSessoin;
export {};
