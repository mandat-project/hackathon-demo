import axios from "axios";
import { exportJWK, SignJWT } from "jose";
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
const requestAccessToken = async (authorization_code, pkce_code_verifier, redirect_uri, client_id, client_secret, token_endpoint, key_pair) => {
    // prepare public key to bind access token to
    const jwk_public_key = await exportJWK(key_pair.publicKey);
    jwk_public_key.alg = "ES256";
    // sign the access token request DPoP token
    const dpop = await new SignJWT({
        htu: token_endpoint,
        htm: "POST",
    })
        .setIssuedAt()
        .setJti(window.crypto.randomUUID())
        .setProtectedHeader({
        alg: "ES256",
        typ: "dpop+jwt",
        jwk: jwk_public_key,
    })
        .sign(key_pair.privateKey);
    return axios({
        url: token_endpoint,
        method: "post",
        headers: {
            dpop,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data: new URLSearchParams({
            grant_type: "authorization_code",
            code: authorization_code,
            code_verifier: pkce_code_verifier,
            redirect_uri: redirect_uri,
            client_id: client_id,
            client_secret: client_secret,
        }),
    });
};
export { requestAccessToken };
