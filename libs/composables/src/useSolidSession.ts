import { reactive } from "vue";
import { Session } from "@shared/solid";
import { AxiosRequestConfig } from "axios";

class RdpCapableSession extends Session {
  private rdp_: string | undefined;
  constructor(rdp: string) {
    super();
    if (rdp !== "") {
      this.updateSessionWithRDP(rdp);
    }
  }
  async authFetch(config: AxiosRequestConfig<any>, dpopPayload?: any) {
    const requestedURL = new URL(config.url!);
    if (this.rdp_ !== undefined && this.rdp_ !== "") {
      const requestURL = new URL(config.url!);
      requestURL.searchParams.set("host", requestURL.host);
      requestURL.host = new URL(this.rdp_).host;
      config.url = requestURL.toString();
    }
    if (!dpopPayload) {
      dpopPayload = {
        htu: `${requestedURL.protocol}//${requestedURL.host}${requestedURL.pathname}`, // ! adjust to `${requestURL.protocol}//${requestURL.host}${requestURL.pathname}`
        htm: config.method,
        // ! ptu: requestedURL.toString(),
      };
    }
    return super.authFetch(config, dpopPayload);
  }
  updateSessionWithRDP(rdp: string) {
    this.rdp_ = rdp;
  }
  get rdp() {
    return this.rdp_;
  }
}

interface IuseSolidSessoin {
  session: RdpCapableSession;
  restoreSession: () => Promise<void>;
}

const session = reactive(new RdpCapableSession(""));

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
  return {
    session,
    restoreSession,
  } as IuseSolidSessoin;
};
