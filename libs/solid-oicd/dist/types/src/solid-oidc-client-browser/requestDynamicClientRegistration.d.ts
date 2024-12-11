import axios from "axios";
/**
 * When the client does not have a webid profile document, use this.
 *
 * @param registration_endpoint
 * @param redirect__uris
 * @returns
 */
declare const requestDynamicClientRegistration: (registration_endpoint: string, redirect__uris: string[]) => Promise<axios.AxiosResponse<any, any>>;
export { requestDynamicClientRegistration };
