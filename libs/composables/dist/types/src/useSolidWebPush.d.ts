export declare const useSolidWebPush: () => {
    subscribeForResource: (uri: string) => Promise<import("axios").AxiosResponse<any, any>>;
    unsubscribeFromResource: (uri: string) => Promise<import("axios").AxiosResponse<any, any>>;
};
