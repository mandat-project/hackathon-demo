import axios from "axios";
import { GenerateKeyPairResult, KeyLike } from "jose";
/**
 * Request an dpop-bound access token from a token endpoint
 * @param authorization_code
 * @param pkce_code_verifier
 * @param redirect_uri
 * @param client_id
 * @param client_secret
 * @param token_endpoint
 * @param key_pair
 * @returns
 */
declare const requestAccessToken: (authorization_code: string, pkce_code_verifier: string, redirect_uri: string, client_id: string, client_secret: string, token_endpoint: string, key_pair: GenerateKeyPairResult<KeyLike>) => Promise<axios.AxiosResponse<any, any>>;
export { requestAccessToken };
