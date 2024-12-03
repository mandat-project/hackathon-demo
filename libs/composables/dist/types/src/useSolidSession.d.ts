import { Session } from "hackathon-demo/libs/solid";
import { AxiosRequestConfig } from "axios";
declare class RdpCapableSession extends Session {
    private rdp_;
    constructor(rdp: string);
    authFetch(config: AxiosRequestConfig<any>, dpopPayload?: any): Promise<import("axios").AxiosResponse<any, any>>;
    updateSessionWithRDP(rdp: string): void;
    get rdp(): string | undefined;
}
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
