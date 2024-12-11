"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestAccessToken = void 0;
const axios_1 = __importDefault(require("axios"));
const jose_1 = require("jose");
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
exports.requestAccessToken = requestAccessToken;
