"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renewTokens = void 0;
const jose_1 = require("jose");
const axios_1 = __importDefault(require("axios"));
const renewTokens = async () => {
    const client_id = sessionStorage.getItem("client_id");
    const client_secret = sessionStorage.getItem("client_secret");
    const refresh_token = sessionStorage.getItem("refresh_token");
    const token_endpoint = sessionStorage.getItem("token_endpoint");
    if (!client_id || !client_secret || !refresh_token || !token_endpoint) {
        // we can not restore the old session
        throw new Error("Cannot renew tokens");
    }
    // RFC 9449 DPoP
    const key_pair = await (0, jose_1.generateKeyPair)("ES256");
    const token_response = (await requestFreshTokens(refresh_token, client_id, client_secret, token_endpoint, key_pair)).data;
    return {
        ...token_response,
        dpop_key_pair: key_pair,
    };
};
exports.renewTokens = renewTokens;
/**
 * Request an dpop-bound access token from a token endpoint using a refresh token
 * @param authorization_code
 * @param pkce_code_verifier
 * @param redirect_uri
 * @param client_id
 * @param client_secret
 * @param token_endpoint
 * @param key_pair
 * @returns
 */
const requestFreshTokens = async (refresh_token, client_id, client_secret, token_endpoint, key_pair) => {
    // prepare public key to bind access token to
    const jwk_public_key = await (0, jose_1.exportJWK)(key_pair.publicKey);
    jwk_public_key.alg = "ES256";
    // sign the access token request DPoP token
    const dpop = await new jose_1.SignJWT({
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
    return (0, axios_1.default)({
        url: token_endpoint,
        method: "post",
        headers: {
            authorization: `Basic ${btoa(`${client_id}:${client_secret}`)}`,
            dpop,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refresh_token,
        }),
    });
};
