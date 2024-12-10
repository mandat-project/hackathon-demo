import { AxiosRequestConfig } from "axios";
import { Session } from "hackathon-demo/libs/solid";
export declare class RdpCapableSession extends Session {
    private rdp_;
    constructor(rdp: string);
    authFetch(config: AxiosRequestConfig<any>, dpopPayload?: any): Promise<import("axios").AxiosResponse<any, any>>;
    updateSessionWithRDP(rdp: string): void;
    get rdp(): string | undefined;
}
