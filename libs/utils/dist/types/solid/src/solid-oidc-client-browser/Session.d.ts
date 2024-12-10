import axios, { AxiosRequestConfig } from "axios";
export declare class Session {
    private tokenInformation;
    private isActive_;
    private webId_;
    login: (idp: string, redirect_uri: string) => Promise<void>;
    logout(): void;
    handleRedirectFromLogin(): Promise<void>;
    private createSignedDPoPToken;
    /**
     * Make axios requests.
     * If session is established, authenticated requests are made.
     *
     * @param config the axios config to use (authorization header, dpop header will be overwritten in active session)
     * @param dpopPayload optional, the payload of the dpop token to use (overwrites the default behaviour of `htu=config.url` and `htm=config.method`)
     * @returns axios response
     */
    authFetch(config: AxiosRequestConfig<any>, dpopPayload?: any): Promise<axios.AxiosResponse<any, any>>;
    get isActive(): boolean;
    get webId(): string | undefined;
}
