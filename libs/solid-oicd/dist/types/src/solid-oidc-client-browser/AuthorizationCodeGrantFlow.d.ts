import { SessionTokenInformation } from "./SessionTokenInformation";
/**
 * Login with the idp, using dynamic client registration.
 * TODO generalise to use a provided client webid
 * TODO generalise to use provided client_id und client_secret
 *
 * @param idp
 * @param redirect_uri
 */
declare const redirectForLogin: (idp: string, redirect_uri: string) => Promise<void>;
/**
 * On incoming redirect from OpenID provider (idp/iss),
 * URL contains authrization code, issuer (idp) and state (csrf token),
 * get an access token for the authrization code.
 */
declare const onIncomingRedirect: () => Promise<SessionTokenInformation | undefined>;
export { redirectForLogin, onIncomingRedirect };
