import { Session } from "@datev-research/mandat-shared-solid-oidc";
import { AxiosRequestConfig } from "axios";
export declare class RdpCapableSession extends Session {
    private rdp_;
    constructor(rdp: string);
    authFetch(config: AxiosRequestConfig<any>, dpopPayload?: any): Promise<import("axios").AxiosResponse<any, any>>;
    updateSessionWithRDP(rdp: string): void;
    get rdp(): string | undefined;
}
