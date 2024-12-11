"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Session = void 0;
const jose_1 = require("jose");
const axios_1 = __importDefault(require("axios"));
const AuthorizationCodeGrantFlow_1 = require("./AuthorizationCodeGrantFlow");
const RefreshTokenGrant_1 = require("./RefreshTokenGrant");
class Session {
    tokenInformation;
    isActive_ = false;
    webId_ = undefined;
    login = AuthorizationCodeGrantFlow_1.redirectForLogin;
    logout() {
        this.tokenInformation = undefined;
        this.isActive_ = false;
        this.webId_ = undefined;
        // clean session storage
        sessionStorage.removeItem("idp");
        sessionStorage.removeItem("client_id");
        sessionStorage.removeItem("client_secret");
        sessionStorage.removeItem("token_endpoint");
        sessionStorage.removeItem("refresh_token");
    }
    handleRedirectFromLogin() {
        return (0, AuthorizationCodeGrantFlow_1.onIncomingRedirect)().then(async (sessionInfo) => {
            if (!sessionInfo) {
                // try refresh
                sessionInfo = await (0, RefreshTokenGrant_1.renewTokens)().catch((_) => {
                    return undefined;
                });
            }
            if (!sessionInfo) {
                // still no session
                return;
            }
            // we got a sessionInfo
            this.tokenInformation = sessionInfo;
            this.isActive_ = true;
            this.webId_ = (0, jose_1.decodeJwt)(this.tokenInformation.access_token)["webid"];
        });
    }
    async createSignedDPoPToken(payload) {
        if (this.tokenInformation == undefined) {
            throw new Error("Session not established.");
        }
        const jwk_public_key = await (0, jose_1.exportJWK)(this.tokenInformation.dpop_key_pair.publicKey);
        return new jose_1.SignJWT(payload)
            .setIssuedAt()
            .setJti(window.crypto.randomUUID())
            .setProtectedHeader({
            alg: "ES256",
            typ: "dpop+jwt",
            jwk: jwk_public_key,
        })
            .sign(this.tokenInformation.dpop_key_pair.privateKey);
    }
    /**
     * Make axios requests.
     * If session is established, authenticated requests are made.
     *
     * @param config the axios config to use (authorization header, dpop header will be overwritten in active session)
     * @param dpopPayload optional, the payload of the dpop token to use (overwrites the default behaviour of `htu=config.url` and `htm=config.method`)
     * @returns axios response
     */
    async authFetch(config, dpopPayload) {
        // prepare authenticated call using a DPoP token (either provided payload, or default)
        const headers = config.headers ? config.headers : {};
        if (this.tokenInformation) {
            const requestURL = new URL(config.url);
            dpopPayload = dpopPayload
                ? dpopPayload
                : {
                    htu: `${requestURL.protocol}//${requestURL.host}${requestURL.pathname}`,
                    htm: config.method,
                };
            const dpop = await this.createSignedDPoPToken(dpopPayload);
            headers["dpop"] = dpop;
            headers["authorization"] = `DPoP ${this.tokenInformation.access_token}`;
        }
        config.headers = headers;
        return (0, axios_1.default)(config);
    }
    get isActive() {
        return this.isActive_;
    }
    get webId() {
        return this.webId_;
    }
}
exports.Session = Session;
