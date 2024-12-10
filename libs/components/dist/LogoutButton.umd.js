(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("vue"), require("n3"), require("axios"), require("jose"));
	else if(typeof define === 'function' && define.amd)
		define(["vue", "n3", "axios", "jose"], factory);
	else if(typeof exports === 'object')
		exports["LogoutButton"] = factory(require("vue"), require("n3"), require("axios"), require("jose"));
	else
		root["LogoutButton"] = factory(root["vue"], root["n3"], root["axios"], root["jose"]);
})((typeof self !== 'undefined' ? self : this), function(__WEBPACK_EXTERNAL_MODULE__380__, __WEBPACK_EXTERNAL_MODULE__907__, __WEBPACK_EXTERNAL_MODULE__742__, __WEBPACK_EXTERNAL_MODULE__603__) {
return /******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 0:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

var __webpack_unused_export__;

__webpack_unused_export__ = ({ value: true });
exports.H = void 0;
const solid_1 = __webpack_require__(273);
class RdpCapableSession extends solid_1.Session {
    rdp_;
    constructor(rdp) {
        super();
        if (rdp !== "") {
            this.updateSessionWithRDP(rdp);
        }
    }
    async authFetch(config, dpopPayload) {
        const requestedURL = new URL(config.url);
        if (this.rdp_ !== undefined && this.rdp_ !== "") {
            const requestURL = new URL(config.url);
            requestURL.searchParams.set("host", requestURL.host);
            requestURL.host = new URL(this.rdp_).host;
            config.url = requestURL.toString();
        }
        if (!dpopPayload) {
            dpopPayload = {
                htu: `${requestedURL.protocol}//${requestedURL.host}${requestedURL.pathname}`, // ! adjust to `${requestURL.protocol}//${requestURL.host}${requestURL.pathname}`
                htm: config.method,
                // ! ptu: requestedURL.toString(),
            };
        }
        return super.authFetch(config, dpopPayload);
    }
    updateSessionWithRDP(rdp) {
        this.rdp_ = rdp;
    }
    get rdp() {
        return this.rdp_;
    }
}
exports.H = RdpCapableSession;


/***/ }),

/***/ 632:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

var __webpack_unused_export__;

__webpack_unused_export__ = ({ value: true });
__webpack_unused_export__ = void 0;
const useSolidProfile_1 = __webpack_require__(585);
const useSolidSession_1 = __webpack_require__(400);
const vue_1 = __webpack_require__(380);
const useIsLoggedIn = () => {
    const { session } = (0, useSolidSession_1.useSolidSession)();
    const { memberOf } = (0, useSolidProfile_1.useSolidProfile)();
    const isLoggedIn = (0, vue_1.computed)(() => {
        return (!!((session.webId && !memberOf) || (session.webId && memberOf && session.rdp)));
    });
    return { isLoggedIn };
};
__webpack_unused_export__ = useIsLoggedIn;


/***/ }),

/***/ 585:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   useSolidProfile: function() { return /* binding */ useSolidProfile; }
/* harmony export */ });
/* harmony import */ var hackathon_demo_libs_solid__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(273);
/* harmony import */ var n3__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(907);
/* harmony import */ var n3__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(n3__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var vue__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(380);
/* harmony import */ var vue__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(vue__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _useSolidSession__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(400);




let session;
const name = (0,vue__WEBPACK_IMPORTED_MODULE_2__.ref)("");
const img = (0,vue__WEBPACK_IMPORTED_MODULE_2__.ref)("");
const inbox = (0,vue__WEBPACK_IMPORTED_MODULE_2__.ref)("");
const storage = (0,vue__WEBPACK_IMPORTED_MODULE_2__.ref)("");
const authAgent = (0,vue__WEBPACK_IMPORTED_MODULE_2__.ref)("");
const accessInbox = (0,vue__WEBPACK_IMPORTED_MODULE_2__.ref)("");
const memberOf = (0,vue__WEBPACK_IMPORTED_MODULE_2__.ref)("");
const hasOrgRDP = (0,vue__WEBPACK_IMPORTED_MODULE_2__.ref)("");
const useSolidProfile = () => {
    if (!session) {
        const { session: sessionRef } = (0,_useSolidSession__WEBPACK_IMPORTED_MODULE_3__.useSolidSession)();
        session = sessionRef;
    }
    (0,vue__WEBPACK_IMPORTED_MODULE_2__.watch)(() => session.webId, async () => {
        const webId = session.webId;
        let store = new n3__WEBPACK_IMPORTED_MODULE_1__.Store();
        if (session.webId !== undefined) {
            store = await (0,hackathon_demo_libs_solid__WEBPACK_IMPORTED_MODULE_0__.getResource)(webId)
                .then((resp) => resp.data)
                .then((respText) => (0,hackathon_demo_libs_solid__WEBPACK_IMPORTED_MODULE_0__.parseToN3)(respText, webId))
                .then((parsedN3) => parsedN3.store);
        }
        let query = store.getObjects(webId, (0,hackathon_demo_libs_solid__WEBPACK_IMPORTED_MODULE_0__.VCARD)("hasPhoto"), null);
        img.value = query.length > 0 ? query[0].value : "";
        query = store.getObjects(webId, (0,hackathon_demo_libs_solid__WEBPACK_IMPORTED_MODULE_0__.VCARD)("fn"), null);
        name.value = query.length > 0 ? query[0].value : "";
        query = store.getObjects(webId, (0,hackathon_demo_libs_solid__WEBPACK_IMPORTED_MODULE_0__.LDP)("inbox"), null);
        inbox.value = query.length > 0 ? query[0].value : "";
        query = store.getObjects(webId, (0,hackathon_demo_libs_solid__WEBPACK_IMPORTED_MODULE_0__.SPACE)("storage"), null);
        storage.value = query.length > 0 ? query[0].value : "";
        query = store.getObjects(webId, (0,hackathon_demo_libs_solid__WEBPACK_IMPORTED_MODULE_0__.INTEROP)("hasAuthorizationAgent"), null);
        authAgent.value = query.length > 0 ? query[0].value : "";
        query = store.getObjects(webId, (0,hackathon_demo_libs_solid__WEBPACK_IMPORTED_MODULE_0__.INTEROP)("hasAccessInbox"), null);
        accessInbox.value = query.length > 0 ? query[0].value : "";
        query = store.getObjects(webId, (0,hackathon_demo_libs_solid__WEBPACK_IMPORTED_MODULE_0__.ORG)("memberOf"), null);
        const uncheckedMemberOf = query.length > 0 ? query[0].value : "";
        if (uncheckedMemberOf !== "") {
            let storeOrg = new n3__WEBPACK_IMPORTED_MODULE_1__.Store();
            storeOrg = await (0,hackathon_demo_libs_solid__WEBPACK_IMPORTED_MODULE_0__.getResource)(uncheckedMemberOf)
                .then((resp) => resp.data)
                .then((respText) => (0,hackathon_demo_libs_solid__WEBPACK_IMPORTED_MODULE_0__.parseToN3)(respText, uncheckedMemberOf))
                .then((parsedN3) => parsedN3.store);
            const isMember = storeOrg.getQuads(uncheckedMemberOf, (0,hackathon_demo_libs_solid__WEBPACK_IMPORTED_MODULE_0__.ORG)("hasMember"), webId, null).length > 0;
            if (isMember) {
                memberOf.value = uncheckedMemberOf;
                query = storeOrg.getObjects(uncheckedMemberOf, (0,hackathon_demo_libs_solid__WEBPACK_IMPORTED_MODULE_0__.MANDAT)("hasRightsDelegationProxy"), null);
                hasOrgRDP.value = query.length > 0 ? query[0].value : "";
                session.updateSessionWithRDP(hasOrgRDP.value);
                // and also overwrite fields from org profile
                query = storeOrg.getObjects(memberOf.value, (0,hackathon_demo_libs_solid__WEBPACK_IMPORTED_MODULE_0__.VCARD)("fn"), null);
                name.value += ` (Org: ${query.length > 0 ? query[0].value : "N/A"})`;
                query = storeOrg.getObjects(memberOf.value, (0,hackathon_demo_libs_solid__WEBPACK_IMPORTED_MODULE_0__.LDP)("inbox"), null);
                inbox.value = query.length > 0 ? query[0].value : "";
                query = storeOrg.getObjects(memberOf.value, (0,hackathon_demo_libs_solid__WEBPACK_IMPORTED_MODULE_0__.SPACE)("storage"), null);
                storage.value = query.length > 0 ? query[0].value : "";
                query = storeOrg.getObjects(memberOf.value, (0,hackathon_demo_libs_solid__WEBPACK_IMPORTED_MODULE_0__.INTEROP)("hasAuthorizationAgent"), null);
                authAgent.value = query.length > 0 ? query[0].value : "";
                query = storeOrg.getObjects(memberOf.value, (0,hackathon_demo_libs_solid__WEBPACK_IMPORTED_MODULE_0__.INTEROP)("hasAccessInbox"), null);
                accessInbox.value = query.length > 0 ? query[0].value : "";
            }
        }
    });
    return {
        name, img, inbox, storage, authAgent, accessInbox, memberOf, hasOrgRDP,
    };
};


/***/ }),

/***/ 400:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   useSolidSession: function() { return /* binding */ useSolidSession; }
/* harmony export */ });
/* harmony import */ var vue__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(380);
/* harmony import */ var vue__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(vue__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _rdpCapableSession__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(0);


let session;
async function restoreSession() {
    await session.handleRedirectFromLogin();
}
/**
 * Auto-re-login / and handle redirect after login
 *
 * Use in App.vue like this
 * ```ts
    // plain (without any routing framework)
    restoreSession()
    // but if you use a router, make sure it is ready
    router.isReady().then(restoreSession)
   ```
 */
const useSolidSession = () => {
    session ??= (0,vue__WEBPACK_IMPORTED_MODULE_0__.inject)('useSolidSession:RdpCapableSession', () => (0,vue__WEBPACK_IMPORTED_MODULE_0__.reactive)(new _rdpCapableSession__WEBPACK_IMPORTED_MODULE_1__/* .RdpCapableSession */ .H("")), true);
    return {
        session,
        restoreSession,
    };
};


/***/ }),

/***/ 141:
/***/ (function(__unused_webpack_module, exports) {

var __webpack_unused_export__;

__webpack_unused_export__ = ({ value: true });


/***/ }),

/***/ 273:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  ACL: function() { return /* reexport */ namespaces.ACL; },
  AD: function() { return /* reexport */ namespaces.AD; },
  AS: function() { return /* reexport */ namespaces.AS; },
  AUTH: function() { return /* reexport */ namespaces.AUTH; },
  CREDIT: function() { return /* reexport */ namespaces.CREDIT; },
  DCT: function() { return /* reexport */ namespaces.DCT; },
  ETHON: function() { return /* reexport */ namespaces.ETHON; },
  FOAF: function() { return /* reexport */ namespaces.FOAF; },
  GDPRP: function() { return /* reexport */ namespaces.GDPRP; },
  INTEROP: function() { return /* reexport */ namespaces.INTEROP; },
  LDCV: function() { return /* reexport */ namespaces.LDCV; },
  LDP: function() { return /* reexport */ namespaces.LDP; },
  MANDAT: function() { return /* reexport */ namespaces.MANDAT; },
  ORG: function() { return /* reexport */ namespaces.ORG; },
  PDGR: function() { return /* reexport */ namespaces.PDGR; },
  PUSH: function() { return /* reexport */ namespaces.PUSH; },
  RDF: function() { return /* reexport */ namespaces.RDF; },
  RDFS: function() { return /* reexport */ namespaces.RDFS; },
  SCHEMA: function() { return /* reexport */ namespaces.SCHEMA; },
  SEC: function() { return /* reexport */ namespaces.SEC; },
  SHAPETREE: function() { return /* reexport */ namespaces.SHAPETREE; },
  SKOS: function() { return /* reexport */ namespaces.SKOS; },
  SPACE: function() { return /* reexport */ namespaces.SPACE; },
  SVCS: function() { return /* reexport */ namespaces.SVCS; },
  Session: function() { return /* reexport */ Session; },
  VCARD: function() { return /* reexport */ namespaces.VCARD; },
  WD: function() { return /* reexport */ namespaces.WD; },
  WDT: function() { return /* reexport */ namespaces.WDT; },
  WILD: function() { return /* reexport */ namespaces.WILD; },
  XSD: function() { return /* reexport */ namespaces.XSD; },
  __esModule: function() { return /* reexport */ n3Extensions/* __esModule */.BJ; },
  canonicaliseTerm: function() { return /* reexport */ n3Extensions/* canonicaliseTerm */.SV; },
  createContainer: function() { return /* reexport */ createContainer; },
  createResource: function() { return /* reexport */ createResource; },
  createResourceInAnyRegistrationOfShape: function() { return /* reexport */ createResourceInAnyRegistrationOfShape; },
  deleteResource: function() { return /* reexport */ deleteResource; },
  getAclResourceUri: function() { return /* reexport */ getAclResourceUri; },
  getContainerItems: function() { return /* reexport */ getContainerItems; },
  getDataRegistrationContainers: function() { return /* reexport */ getDataRegistrationContainers; },
  getLinkHeader: function() { return /* reexport */ getLinkHeader; },
  getLocationHeader: function() { return /* reexport */ getLocationHeader; },
  getResource: function() { return /* reexport */ getResource; },
  parseToN3: function() { return /* reexport */ parseToN3; },
  patchResource: function() { return /* reexport */ patchResource; },
  postResource: function() { return /* reexport */ postResource; },
  putResource: function() { return /* reexport */ putResource; },
  toTTL: function() { return /* reexport */ n3Extensions/* toTTL */.sT; }
});

// EXTERNAL MODULE: ../solid/src/n3Extensions.ts
var n3Extensions = __webpack_require__(710);
// EXTERNAL MODULE: ../solid/src/namespaces.ts
var namespaces = __webpack_require__(91);
// EXTERNAL MODULE: external "axios"
var external_axios_ = __webpack_require__(742);
var external_axios_default = /*#__PURE__*/__webpack_require__.n(external_axios_);
// EXTERNAL MODULE: external "n3"
var external_n3_ = __webpack_require__(907);
// EXTERNAL MODULE: external "jose"
var external_jose_ = __webpack_require__(603);
;// CONCATENATED MODULE: ../solid/src/solid-oidc-client-browser/requestDynamicClientRegistration.ts

/**
 * When the client does not have a webid profile document, use this.
 *
 * @param registration_endpoint
 * @param redirect__uris
 * @returns
 */
const requestDynamicClientRegistration = async (registration_endpoint, redirect__uris) => {
    // prepare dynamic client registration
    const client_registration_request_body = {
        redirect_uris: redirect__uris,
        grant_types: ["authorization_code", "refresh_token"],
        id_token_signed_response_alg: "ES256",
        token_endpoint_auth_method: "client_secret_basic", // also works with value "none" if you do not provide "client_secret" on token request
        application_type: "web",
        subject_type: "public",
    };
    // register
    return external_axios_default()({
        url: registration_endpoint,
        method: "post",
        data: client_registration_request_body,
    });
};


;// CONCATENATED MODULE: ../solid/src/solid-oidc-client-browser/requestAccessToken.ts


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
    const jwk_public_key = await (0,external_jose_.exportJWK)(key_pair.publicKey);
    jwk_public_key.alg = "ES256";
    // sign the access token request DPoP token
    const dpop = await new external_jose_.SignJWT({
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
    return external_axios_default()({
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


;// CONCATENATED MODULE: ../solid/src/solid-oidc-client-browser/AuthorizationCodeGrantFlow.ts




/**
 * Login with the idp, using dynamic client registration.
 * TODO generalise to use a provided client webid
 * TODO generalise to use provided client_id und client_secret
 *
 * @param idp
 * @param redirect_uri
 */
const redirectForLogin = async (idp, redirect_uri) => {
    // RFC 9207 iss check: remember the identity provider (idp) / issuer (iss)
    sessionStorage.setItem("idp", idp);
    // lookup openid configuration of idp
    const openid_configuration = (await external_axios_default().get(`${idp}/.well-known/openid-configuration`)).data;
    // remember token endpoint
    sessionStorage.setItem("token_endpoint", openid_configuration["token_endpoint"]);
    const registration_endpoint = openid_configuration["registration_endpoint"];
    // get client registration
    const client_registration = (await requestDynamicClientRegistration(registration_endpoint, [
        redirect_uri,
    ])).data;
    // remember client_id and client_secret
    const client_id = client_registration["client_id"];
    sessionStorage.setItem("client_id", client_id);
    const client_secret = client_registration["client_secret"];
    sessionStorage.setItem("client_secret", client_secret);
    // RFC 7636 PKCE, remember code verifer
    const { pkce_code_verifier, pkce_code_challenge } = await getPKCEcode();
    sessionStorage.setItem("pkce_code_verifier", pkce_code_verifier);
    // RFC 6749 OAuth 2.0 - CSRF token
    const csrf_token = window.crypto.randomUUID();
    sessionStorage.setItem("csrf_token", csrf_token);
    // redirect to idp
    const redirect_to_idp = openid_configuration["authorization_endpoint"] +
        `?response_type=code` +
        `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
        `&scope=openid offline_access webid` +
        `&client_id=${client_id}` +
        `&code_challenge_method=S256` +
        `&code_challenge=${pkce_code_challenge}` +
        `&state=${csrf_token}` +
        `&prompt=consent`; // this query parameter value MUST be present for CSS v7 to issue a refresh token (TODO open issue because prompting is the default behaviour but without this query param no refresh token is provided despite the "remember this client" box being checked)
    window.location.href = redirect_to_idp;
};
/**
 * RFC 7636 PKCE
 * @returns PKCE code verifier and PKCE code challenge
 */
const getPKCEcode = async () => {
    // create random string as PKCE code verifier
    const pkce_code_verifier = window.crypto.randomUUID() + "-" + window.crypto.randomUUID();
    // hash the verifier and base64URL encode as PKCE code challenge
    const digest = new Uint8Array(await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(pkce_code_verifier)));
    const pkce_code_challenge = btoa(String.fromCharCode(...digest))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    return { pkce_code_verifier, pkce_code_challenge };
};
/**
 * On incoming redirect from OpenID provider (idp/iss),
 * URL contains authrization code, issuer (idp) and state (csrf token),
 * get an access token for the authrization code.
 */
const onIncomingRedirect = async () => {
    const url = new URL(window.location.href);
    // authorization code
    const authorization_code = url.searchParams.get("code");
    if (authorization_code === null) {
        return undefined;
    }
    // RFC 9207 issuer check
    const idp = sessionStorage.getItem("idp");
    if (idp === null ||
        url.searchParams.get("iss") != idp + (idp.endsWith("/") ? "" : "/")) {
        throw new Error("RFC 9207 - iss != idp - " + url.searchParams.get("iss") + " != " + idp);
    }
    // RFC 6749 OAuth 2.0
    if (url.searchParams.get("state") != sessionStorage.getItem("csrf_token")) {
        throw new Error("RFC 6749 - state != csrf_token - " +
            url.searchParams.get("iss") +
            " != " +
            sessionStorage.getItem("csrf_token"));
    }
    // remove redirect query parameters from URL
    url.searchParams.delete("iss");
    url.searchParams.delete("state");
    url.searchParams.delete("code");
    window.history.pushState({}, document.title, url.toString());
    // prepare token request
    const pkce_code_verifier = sessionStorage.getItem("pkce_code_verifier");
    if (pkce_code_verifier === null) {
        throw new Error("Access Token Request preparation - Could not find in sessionStorage: pkce_code_verifier");
    }
    const client_id = sessionStorage.getItem("client_id");
    if (client_id === null) {
        throw new Error("Access Token Request preparation - Could not find in sessionStorage: client_id");
    }
    const client_secret = sessionStorage.getItem("client_secret");
    if (client_secret === null) {
        throw new Error("Access Token Request preparation - Could not find in sessionStorage: client_secret");
    }
    const token_endpoint = sessionStorage.getItem("token_endpoint");
    if (token_endpoint === null) {
        throw new Error("Access Token Request preparation - Could not find in sessionStorage: token_endpoint");
    }
    // RFC 9449 DPoP
    const key_pair = await (0,external_jose_.generateKeyPair)("ES256");
    // get access token
    const token_response = (await requestAccessToken(authorization_code, pkce_code_verifier, url.toString(), client_id, client_secret, token_endpoint, key_pair)).data;
    // TODO double check if I need to check token for ISS = IDP
    // clean session storage
    // sessionStorage.removeItem("idp");
    sessionStorage.removeItem("csrf_token");
    sessionStorage.removeItem("pkce_code_verifier");
    // sessionStorage.removeItem("client_id");
    // sessionStorage.removeItem("client_secret");
    // sessionStorage.removeItem("token_endpoint");
    // remember refresh_token for session
    sessionStorage.setItem("refresh_token", token_response["refresh_token"]);
    // return client login information
    return {
        ...token_response,
        dpop_key_pair: key_pair,
    };
};


;// CONCATENATED MODULE: ../solid/src/solid-oidc-client-browser/RefreshTokenGrant.ts


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
    const key_pair = await (0,external_jose_.generateKeyPair)("ES256");
    const token_response = (await requestFreshTokens(refresh_token, client_id, client_secret, token_endpoint, key_pair)).data;
    return {
        ...token_response,
        dpop_key_pair: key_pair,
    };
};
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
    const jwk_public_key = await (0,external_jose_.exportJWK)(key_pair.publicKey);
    jwk_public_key.alg = "ES256";
    // sign the access token request DPoP token
    const dpop = await new external_jose_.SignJWT({
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
    return external_axios_default()({
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


;// CONCATENATED MODULE: ../solid/src/solid-oidc-client-browser/Session.ts




class Session {
    tokenInformation;
    isActive_ = false;
    webId_ = undefined;
    login = redirectForLogin;
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
        return onIncomingRedirect().then(async (sessionInfo) => {
            if (!sessionInfo) {
                // try refresh
                sessionInfo = await renewTokens().catch((_) => {
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
            this.webId_ = (0,external_jose_.decodeJwt)(this.tokenInformation.access_token)["webid"];
        });
    }
    async createSignedDPoPToken(payload) {
        if (this.tokenInformation == undefined) {
            throw new Error("Session not established.");
        }
        const jwk_public_key = await (0,external_jose_.exportJWK)(this.tokenInformation.dpop_key_pair.publicKey);
        return new external_jose_.SignJWT(payload)
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
        return external_axios_default()(config);
    }
    get isActive() {
        return this.isActive_;
    }
    get webId() {
        return this.webId_;
    }
}

;// CONCATENATED MODULE: ../solid/src/solidRequests.ts




/**
 * #######################
 * ### BASIC REQUESTS  ###
 * #######################
 */
/**
 *
 * @param response http response, e.g. from axiosFetch
 * @throws Error, if response is not ok
 * @returns the response, if response is ok
 */
function _checkResponseStatus(response) {
    if (response.status >= 400) {
        throw new Error(`Action on \`${response.request.url}\` failed: \`${response.status}\` \`${response.statusText}\`.`);
    }
    return response;
}
/**
 *
 * @param uri the URI to strip from its fragment #
 * @return substring of the uri prior to fragment #
 */
function _stripFragment(uri) {
    if (typeof uri !== "string") {
        return "";
    }
    const indexOfFragment = uri.indexOf("#");
    if (indexOfFragment !== -1) {
        uri = uri.substring(0, indexOfFragment);
    }
    return uri;
}
/**
 *
 * @param uri `<http://ex.org>`
 * @returns `http://ex.org` without the parentheses
 */
function _stripUriFromStartAndEndParentheses(uri) {
    if (uri.startsWith("<"))
        uri = uri.substring(1, uri.length);
    if (uri.endsWith(">"))
        uri = uri.substring(0, uri.length - 1);
    return uri;
}
/**
 * Parse text/turtle to N3.
 * @param text text/turtle
 * @param baseIRI string
 * @return Promise ParsedN3
 */
async function parseToN3(text, baseIRI) {
    const store = new external_n3_.Store();
    const parser = new external_n3_.Parser({
        baseIRI: _stripFragment(baseIRI),
        blankNodePrefix: "",
    }); // { blankNodePrefix: 'any' } does not have the effect I thought
    return new Promise((resolve, reject) => {
        // parser.parse is actually async but types don't tell you that.
        parser.parse(text, (error, quad, prefixes) => {
            if (error)
                reject(error);
            if (quad)
                store.addQuad(quad);
            else
                resolve({ store, prefixes });
        });
    });
}
/**
 * Send a session.axiosFetch request: GET, uri, async requesting `text/turtle`
 *
 * @param uri: the URI of the text/turtle to get
 * @param session: OPTIONAL - session.axiosFetch function to use, e.g. session.authFetch of a solid session
 * @param headers: OPTIONAL - headers to set manually (e.g. `Accept` or `baseIRI`), `content-type` is set by default to `text/turtle`.
 * @return Promise string of the response text/turtle
 */
async function getResource(uri, session, headers) {
    console.log("### SoLiD\t| GET\n" + uri);
    if (session === undefined)
        session = new Session();
    if (!headers)
        headers = {};
    headers["Accept"] = headers["Accept"]
        ? headers["Accept"]
        : "text/turtle,application/ld+json";
    return session
        .authFetch({ url: uri, method: "GET", headers: headers })
        .then(_checkResponseStatus);
}
/**
 * Send a session.axiosFetch request: POST, uri, async providing `text/turtle`
 * providing `text/turtle` and baseURI header, accepting `text/turtle`
 *
 * @param uri: the URI of the server (the text/turtle to post to)
 * @param body: OPTIONAL - the text/turtle to provide
 * @param session: OPTIONAL - session.axiosFetch function to use, e.g. session.authFetch of a solid session
 * @param headers: OPTIONAL - headers to set manually (e.g. `Accept` or `baseIRI`), `content-type` is set by default to `text/turtle`.
 * @return Promise of the response
 */
async function postResource(uri, body, session, headers) {
    if (session === undefined)
        session = new Session();
    if (!headers)
        headers = {};
    headers["Content-type"] = headers["Content-type"]
        ? headers["Content-type"]
        : "text/turtle";
    return session
        .authFetch({
        url: uri,
        method: "POST",
        headers: headers,
        data: body,
    })
        .then(_checkResponseStatus);
}
/**
 * Send a session.axiosFetch request: POST, location uri, container name, async .
 * This will generate a new URI at which the resource will be available.
 * The response's `Location` header will contain the URL of the created resource.
 *
 * @param uri: the URI of the resrouce to post to / to be located at
 * @param body: the body of the resource to create
 * @param session: OPTIONAL - session.axiosFetch function to use, e.g. session.authFetch of a solid session
 * @return Promise Response
 */
async function createResource(locationURI, body, session, headers) {
    console.log("### SoLiD\t| CREATE RESOURCE AT\n" + locationURI);
    if (!headers)
        headers = {};
    headers["Content-type"] = headers["Content-type"]
        ? headers["Content-type"]
        : "text/turtle";
    headers["Link"] = `<${(0,namespaces.LDP)("Resource")}>; rel="type"`;
    return postResource(locationURI, body, session, headers);
}
/**
 * Send a session.axiosFetch request: POST, location uri, resource name, async .
 * If the container already exists, an additional one with a prefix will be created.
 * The response's `Location` header will contain the URL of the created resource.
 *
 * @param uri: the URI of the container to post to
 * @param name: the name of the container
 * @param session: OPTIONAL - session.axiosFetch function to use, e.g. session.authFetch of a solid session
 * @return Promise Response (location header not included (i think) since you know the name and folder)
 */
async function createContainer(locationURI, name, session) {
    console.log("### SoLiD\t| CREATE CONTAINER\n" + locationURI + name + "/");
    const body = undefined;
    return postResource(locationURI, body, session, {
        Link: `<${(0,namespaces.LDP)("BasicContainer")}>; rel="type"`,
        Slug: name,
    });
}
/**
 * Get the Location header of a newly created resource.
 * @param resp string location header
 */
function getLocationHeader(resp) {
    if (!(resp.headers instanceof external_axios_.AxiosHeaders && resp.headers.has("Location"))) {
        throw new Error(`Location Header at \`${resp.request.url}\` not set.`);
    }
    let loc = resp.headers.get("Location");
    if (!loc) {
        throw new Error(`Could not get Location Header at \`${resp.request.url}\`.`);
    }
    loc = loc.toString();
    if (!loc.startsWith("http://") && !loc.startsWith("https://")) {
        loc = new URL(resp.request.url).origin + loc;
    }
    return loc;
}
/**
 * Shortcut to get the items in a container.
 *
 * @param uri The container's URI to get the items from
 * @param session
 * @returns string URIs of the items in the container
 */
async function getContainerItems(uri, session) {
    console.log("### SoLiD\t| GET CONTAINER ITEMS\n" + uri);
    return getResource(uri, session)
        .then((resp) => resp.data)
        .then((txt) => parseToN3(txt, uri))
        .then((parsedN3) => parsedN3.store)
        .then((store) => store.getObjects(uri, (0,namespaces.LDP)("contains"), null).map((obj) => obj.value));
}
/**
 * Send a session.axiosFetch request: PUT, uri, async providing `text/turtle`
 *
 * @param uri: the URI of the text/turtle to be put
 * @param body: the text/turtle to provide
 * @param session: OPTIONAL - session.axiosFetch function to use, e.g. session.authFetch of a solid session
 * @return Promise string  of the created URI from the response `Location` header
 */
async function putResource(uri, body, session, headers) {
    console.log("### SoLiD\t| PUT\n" + uri);
    if (session === undefined)
        session = new Session();
    if (!headers)
        headers = {};
    headers["Content-type"] = headers["Content-type"]
        ? headers["Content-type"]
        : "text/turtle";
    headers["Link"] = `<${(0,namespaces.LDP)("Resource")}>; rel="type"`;
    return session
        .authFetch({
        url: uri,
        method: "PUT",
        headers: headers,
        data: body,
    })
        .then(_checkResponseStatus);
}
/**
 * Send a session.axiosFetch request: PATCH, uri, async providing `text/n3`
 *
 * @param uri: the URI of the text/n3 to be patch
 * @param body: the text/turtle to provide
 * @param session: OPTIONAL - session.axiosFetch function to use, e.g. session.authFetch of a solid session
 * @return Promise string  of the created URI from the response `Location` header
 */
async function patchResource(uri, body, session) {
    console.log("### SoLiD\t| PATCH\n" + uri);
    if (session === undefined)
        session = new Session();
    return session
        .authFetch({
        url: uri,
        method: "PATCH",
        headers: { "Content-Type": "text/n3" },
        data: body,
    })
        .then(_checkResponseStatus);
}
/**
 * Send a session.axiosFetch request: DELETE, uri, async
 *
 * @param uri: the URI of the text/turtle to delete
 * @param session: OPTIONAL - session.axiosFetch function to use, e.g. session.authFetch of a solid session
 * @return true if http request successfull with status 204
 */
async function deleteResource(uri, session) {
    console.log("### SoLiD\t| DELETE\n" + uri);
    if (session === undefined)
        session = new Session();
    return session
        .authFetch({
        url: uri,
        method: "DELETE",
    })
        .then(_checkResponseStatus)
        .then(() => true);
}
/**
 * ####################
 * ## Access Control ##
 * ####################
 */
/**
 * `http://ex.org/test.txt` > `http://ex.org/` and `http://ex.org/test/` > `http://ex.org/test/`
 * @param uri the resource
 * @returns folder the resource is in; if the resource is a folder, the folder uri itself is returned
 */
function _getSameLocationAs(uri) {
    return uri.substring(0, uri.lastIndexOf("/") + 1);
}
/**
 * `http://ex.org/test.txt` > `http://ex.org/` and `http://ex.org/test/` > `http://ex.org/`
 * @param uri the resource
 * @returns the URI of the parent resource, i.e. the folder where the resource lives
 */
function _getParentUri(uri) {
    let parent;
    if (!uri.endsWith("/"))
        // uri is resource
        parent = _getSameLocationAs(uri);
    else
        parent = uri
            // get parent folder
            .substring(0, uri.length - 1)
            .substring(0, uri.lastIndexOf("/"));
    if (parent == "http://" || parent == "https://")
        throw new Error(`Parent not found: Reached root folder at \`${uri}\`.`); // reached the top
    return parent;
}
/**
 * Parses Header "Link", e.g. <.acl>; rel="acl", <.meta>; rel="describedBy", <http://www.w3.org/ns/ldp#Container>; rel="type", <http://www.w3.org/ns/ldp#BasicContainer>; rel="type"
 *
 * @param txt string of the Link Header#
 * @returns the object parsed
 */
function _parseLinkHeader(txt) {
    const parsedObj = {};
    const propArray = txt.split(",").map((obj) => obj.split(";"));
    for (const prop of propArray) {
        if (parsedObj[prop[1].trim().split('"')[1]] === undefined) {
            // first element to have this prop type
            parsedObj[prop[1].trim().split('"')[1]] = prop[0].trim();
        }
        else {
            // this prop type is already set
            const propArray = new Array(parsedObj[prop[1].trim().split('"')[1]]).flat();
            propArray.push(prop[0].trim());
            parsedObj[prop[1].trim().split('"')[1]] = propArray;
        }
    }
    return parsedObj;
}
/**
 * Send a session.axiosFetch request: HEAD, uri, header `Link` as json obj
 *
 * @param uri: the URI of the text/turtle to get the access control file for
 * @param session: OPTIONAL - session.axiosFetch function to use, e.g. session.authFetch of a solid session
 * @return Json object of the Link header
 */
async function getLinkHeader(uri, session) {
    console.log("### SoLiD\t| HEAD\n" + uri);
    if (session === undefined)
        session = new Session();
    return session
        .authFetch({ url: uri, method: "HEAD" })
        .then(_checkResponseStatus)
        .then((resp) => {
        if (!(resp.headers instanceof external_axios_.AxiosHeaders && resp.headers.has("Link"))) {
            throw new Error(`Link Header at \`${resp.request.url}\` not set.`);
        }
        const linkHeader = resp.headers.get("Link");
        if (linkHeader == null) {
            throw new Error(`Could not get Link Header at \`${resp.request.url}\`.`);
        }
        else {
            return linkHeader.toString();
        }
    }) // e.g. <.acl>; rel="acl", <.meta>; rel="describedBy", <http://www.w3.org/ns/ldp#Container>; rel="type", <http://www.w3.org/ns/ldp#BasicContainer>; rel="type"
        .then(_parseLinkHeader);
}
async function getAclResourceUri(uri, session) {
    console.log("### SoLiD\t| ACL\n" + uri);
    if (session === undefined)
        session = new Session();
    return getLinkHeader(uri, session)
        .then((lnk) => _stripUriFromStartAndEndParentheses(lnk.acl))
        .then((acl) => {
        if (acl.startsWith("http://") || acl.startsWith("https://")) {
            return acl;
        }
        return _getSameLocationAs(uri) + acl;
    });
}

;// CONCATENATED MODULE: ../solid/src/interopRequest.ts



async function createResourceInAnyRegistrationOfShape(webId, shapeTreeUri, resourceBody, session) {
    if (session === undefined)
        session = new Session();
    const offerContainerUris = (await getDataRegistrationContainers(webId, shapeTreeUri, session))[0];
    return await createResource(offerContainerUris, resourceBody, session);
}
async function getDataRegistrationContainers(webId, shapeTreeUri, session) {
    if (session === undefined)
        session = new Session();
    const registrySetUris = await getRegistrySet(webId, session);
    const dataRegistryUris = [];
    for (const registrySetUri of registrySetUris) {
        dataRegistryUris.push(...(await getDataRegistry(registrySetUri, session)));
    }
    const dataRegistrationUris = [];
    for (const dataRegistryUri of dataRegistryUris) {
        dataRegistrationUris.push(...(await getDataRegistrations(dataRegistryUri, session)));
    }
    const dataRegistrationsOfShapeUris = [];
    for (const dataRegistrationUri of dataRegistrationUris) {
        const hasMatchingShape = await filterDataRegistrationUrisByShapeTreeUri(dataRegistrationUri, shapeTreeUri, session);
        if (hasMatchingShape) {
            dataRegistrationsOfShapeUris.push(dataRegistrationUri);
        }
    }
    return dataRegistrationsOfShapeUris;
}
function getRegistrySet(webId, session) {
    if (session === undefined)
        session = new Session();
    return getResourceAsStore(webId, session).then((store) => store
        .getObjects(null, (0,namespaces.INTEROP)("hasRegistrySet"), null)
        .map((term) => term.value));
}
function getDataRegistry(registrySetUri, session) {
    if (session === undefined)
        session = new Session();
    return getResourceAsStore(registrySetUri, session).then((store) => store
        .getObjects(null, (0,namespaces.INTEROP)("hasDataRegistry"), null)
        .map((term) => term.value));
}
async function getDataRegistrations(dataRegistryUri, session) {
    if (session === undefined)
        session = new Session();
    return getResourceAsStore(dataRegistryUri, session).then((store) => store
        .getObjects(null, (0,namespaces.INTEROP)("hasDataRegistration"), null)
        .map((term) => term.value));
}
function getRegisteredShapeTree(dataRegistrationUri, session) {
    if (session === undefined)
        session = new Session();
    return getResourceAsStore(dataRegistrationUri, session).then((store) => store.getObjects(null, (0,namespaces.INTEROP)("registeredShapeTree"), null)[0].value);
}
async function filterDataRegistrationUrisByShapeTreeUri(dataRegistrationUri, shapeTreeUri, session) {
    if (session === undefined)
        session = new Session();
    const dataRegistrationShapeTree = await getRegisteredShapeTree(dataRegistrationUri, session);
    return dataRegistrationShapeTree === shapeTreeUri;
}
function getResourceAsStore(uri, session) {
    if (session === undefined)
        session = new Session();
    return getResource(uri, session)
        .then((resp) => resp.data)
        .then((txt) => parseToN3(txt, uri))
        .then((parsedN3) => parsedN3.store);
}

;// CONCATENATED MODULE: ../solid/index.ts







/***/ }),

/***/ 710:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "BJ", ({ value: true }));
exports.sT = exports.SV = void 0;
const n3_1 = __webpack_require__(907);
const namespaces_1 = __webpack_require__(91);
/**
 * Generate the canonical string form of a node.
 * @param term n3 term
 * @return string
 */
function canonicaliseTerm(term) {
    switch (term.termType) {
        case "NamedNode":
            return `<${term.value}>`;
        case "BlankNode":
            return `_:${term.value}`;
        case "Literal":
            return `"${term.value}"^^<${term.datatypeString}>`;
        default: // e.g. SerialisedTerm
            return term.value;
    }
}
exports.SV = canonicaliseTerm;
/**
 * From an array, remove all occurences of values that occur more than twice, e.g. [1,2,3,3] => [1,2]
 * @param arr
 * @returns
 */
const _removeDoubles = (arr) => {
    let arrVals = arr.map((term) => term.value);
    arrVals = arrVals.filter((item) => arrVals.lastIndexOf(item) == arrVals.indexOf(item));
    return arr.filter((term) => arrVals.includes(term.value));
};
/**
 * Find lists in an n3 store. Beginning by all rdf:nil, work upstream to retrieve all list items.
 * @param n3Store
 * @returns mapping { head of list : [items, correspondingQuads] }
 */
const _findLists = (n3Store) => {
    const listMapping = {};
    const endOfLists = n3Store.getQuads(null, (0, namespaces_1.RDF)("rest"), (0, namespaces_1.RDF)("nil"), null);
    endOfLists.forEach((quad) => {
        let items = [];
        let quads = [];
        let itemQuads = [];
        let prevQuads = [quad];
        let currentBN = "";
        while (prevQuads.length !== 0) {
            quads = prevQuads.concat(quads);
            const currentQuad = prevQuads[0];
            currentBN = currentQuad.subject.value;
            // get upstream list items
            itemQuads = n3Store.getQuads(currentQuad.subject, (0, namespaces_1.RDF)("first"), null, null);
            quads = itemQuads.concat(quads);
            items = itemQuads.map((quad) => quad.object).concat(items);
            prevQuads = n3Store.getQuads(null, (0, namespaces_1.RDF)("rest"), currentQuad.subject, null);
            // end when no prior item
        }
        listMapping[`${currentBN}`] = [items, quads];
    });
    return listMapping;
};
const _serialiseList = (terms, listMapping, blankNodes, n3Store, n3Writer) => {
    for (const [i, term] of terms.entries()) {
        if (term.termType === "BlankNode") {
            if (Object.keys(listMapping).includes(term.value)) { // list
                const listTerms = listMapping[term.value][0];
                console.log(listMapping);
                const serialisation = ` ( ${_serialiseList(listTerms, listMapping, blankNodes, n3Store, n3Writer).map(canonicaliseTerm).join(" ")} ) `;
                terms[i] = { id: serialisation, value: serialisation };
            }
            else { // blank node
                if (blankNodes.includes(term)) {
                    terms[i] = _serialiseBlankNode(term, blankNodes, listMapping, n3Store, n3Writer);
                }
            }
        }
    }
    return terms;
};
const _serialiseBlankNode = (bn, blankNodes, listMapping, n3Store, n3Writer) => {
    const bquads = n3Store.getQuads(bn, null, null, null);
    const bquads_serial = bquads.map((bquad) => {
        let obj = bquad.object;
        if (obj.termType === "BlankNode") {
            if (Object.keys(listMapping).includes(obj.value)) { // list
                const listTerms = listMapping[obj.value][0];
                const serialisation = ` ( ${_serialiseList(listTerms, listMapping, blankNodes, n3Store, n3Writer).map(canonicaliseTerm).join(" ")} ) `;
                obj = { id: serialisation, value: serialisation };
            }
            else // blank node
             if (blankNodes.includes(bn)) {
                obj = _serialiseBlankNode(obj, blankNodes, listMapping, n3Store, n3Writer);
            }
        }
        return new n3_1.Quad(bquad.subject, bquad.predicate, obj, bquad.graph);
    });
    const battr = [];
    bquads_serial.forEach(bquad => {
        battr.push({ predicate: bquad.predicate, object: bquad.object });
    });
    n3Store.removeQuads(bquads);
    return n3Writer.blank(battr);
};
/**
 * Prints the turtle rdf format.
 *
 * @param n3Store
 * @param n3Prefixes
 * @param baseIRI
 * @returns string
 */
const toTTL = (n3Store, n3Prefixes, baseIRI) => {
    n3Store = new n3_1.Store(n3Store.getQuads(null, null, null, null));
    let result = "";
    const n3Writer = new n3_1.Writer({
        baseIRI: baseIRI,
        prefixes: n3Prefixes,
    });
    // find lists
    const listMapping = _findLists(n3Store);
    Object.entries(listMapping).forEach(entry => {
        // uniquely referenced list head
        if (n3Store.countQuads(null, null, new n3_1.BlankNode(entry[0]), null) !== 1) {
            delete listMapping[entry[0]]; // remove non unique list, or  dangling list from mapping
        }
    });
    // find blank nodes in lists
    const visitedBlankNodes = [];
    Object.entries(listMapping).forEach((entry) => {
        n3Store.removeQuads(entry[1][1]); // remove quads since we will do manual serialisation
        entry[1][0].forEach((term) => {
            if (term.termType === "BlankNode")
                visitedBlankNodes.push(term);
        });
    });
    // find uniquely referenced blank nodes
    let blankNodes = [];
    n3Store.getObjects(null, null, null).forEach((obj) => {
        if (obj.termType == "BlankNode") {
            // if that is already visited during list search, we have a double.
            if (!visitedBlankNodes.map((term) => term.value).includes(obj.value)) { // if not, unique?
                if (n3Store.countQuads(null, null, obj, null) == 1) { // unique!
                    blankNodes.push(obj);
                }
            }
            else { // visited, add for later easy removal of doubles
                visitedBlankNodes.push(obj);
            }
        }
    });
    // array of uniquely referenced blank nodes in graph
    blankNodes = blankNodes.concat(_removeDoubles(visitedBlankNodes));
    // serialise lists
    const serialisedLists = {};
    Object.entries(listMapping).forEach(entry => {
        // uniquely referenced list head
        serialisedLists[entry[0]] = _serialiseList(entry[1][0], listMapping, blankNodes, n3Store, n3Writer); // create list serialisation
    });
    // serialise blank nodes
    const serialisedBlankNodes = {};
    blankNodes.forEach(bn => {
        serialisedBlankNodes[bn.value] = _serialiseBlankNode(bn, blankNodes, listMapping, n3Store, n3Writer);
    });
    // // write
    n3Store.getQuads(null, null, null, null).forEach((quad) => {
        if (quad.object.value in serialisedLists) {
            n3Writer.addQuad(quad.subject, quad.predicate, n3Writer.list(serialisedLists[quad.object.value]));
        }
        else if (quad.object.value in serialisedBlankNodes) {
            n3Writer.addQuad(quad.subject, quad.predicate, serialisedBlankNodes[quad.object.value]);
        }
        else {
            n3Writer.addQuad(quad);
        }
    });
    // n3Writer.addQuads(n3Store.getQuads(null, null, null, null))
    n3Writer.end((error, text) => (result = text));
    // return `# Parsed from underlying RDF graph.\n ${result}`;
    return result;
};
exports.sT = toTTL;
/*
  export function getListItems(n3Store, baseIRI) {
    let node = n3Store
      .getQuads(baseIRI, AS("items"), null, null)
      .map((quad) => quad.object)[0];

    let result = [];

    while (node.value !== RDF("nil")) {
      result.push(
        n3Store
          .getQuads(node, RDF("first"), null, null)
          .map((quad) => quad.object)
      );
      node = n3Store
        .getQuads(node, RDF("rest"), null, null)
        .map((quad) => quad.object)[0];
    }

    return result.flat();
  }

  */


/***/ }),

/***/ 91:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ACL: function() { return /* binding */ ACL; },
/* harmony export */   AD: function() { return /* binding */ AD; },
/* harmony export */   AS: function() { return /* binding */ AS; },
/* harmony export */   AUTH: function() { return /* binding */ AUTH; },
/* harmony export */   CREDIT: function() { return /* binding */ CREDIT; },
/* harmony export */   DCT: function() { return /* binding */ DCT; },
/* harmony export */   ETHON: function() { return /* binding */ ETHON; },
/* harmony export */   FOAF: function() { return /* binding */ FOAF; },
/* harmony export */   GDPRP: function() { return /* binding */ GDPRP; },
/* harmony export */   INTEROP: function() { return /* binding */ INTEROP; },
/* harmony export */   LDCV: function() { return /* binding */ LDCV; },
/* harmony export */   LDP: function() { return /* binding */ LDP; },
/* harmony export */   MANDAT: function() { return /* binding */ MANDAT; },
/* harmony export */   ORG: function() { return /* binding */ ORG; },
/* harmony export */   PDGR: function() { return /* binding */ PDGR; },
/* harmony export */   PUSH: function() { return /* binding */ PUSH; },
/* harmony export */   RDF: function() { return /* binding */ RDF; },
/* harmony export */   RDFS: function() { return /* binding */ RDFS; },
/* harmony export */   SCHEMA: function() { return /* binding */ SCHEMA; },
/* harmony export */   SEC: function() { return /* binding */ SEC; },
/* harmony export */   SHAPETREE: function() { return /* binding */ SHAPETREE; },
/* harmony export */   SKOS: function() { return /* binding */ SKOS; },
/* harmony export */   SPACE: function() { return /* binding */ SPACE; },
/* harmony export */   SVCS: function() { return /* binding */ SVCS; },
/* harmony export */   VCARD: function() { return /* binding */ VCARD; },
/* harmony export */   WD: function() { return /* binding */ WD; },
/* harmony export */   WDT: function() { return /* binding */ WDT; },
/* harmony export */   WILD: function() { return /* binding */ WILD; },
/* harmony export */   XSD: function() { return /* binding */ XSD; }
/* harmony export */ });
/**
 * Concat the RDF namespace identified by the prefix used as function name
 * with the RDF thing identifier as function parameter,
 * e.g. FOAF("knows") resovles to "http://xmlns.com/foaf/0.1/knows"
 * @param namespace uri of the namesapce
 * @returns function which takes a parameter of RDF thing identifier as string
 */
function Namespace(namespace) {
    return (thing) => thing ? namespace.concat(thing) : namespace;
}
// Namespaces as functions where their parameter is the RDF thing identifier => concat, e.g. FOAF("knows") resolves to "http://xmlns.com/foaf/0.1/knows"
const FOAF = Namespace("http://xmlns.com/foaf/0.1/");
const DCT = Namespace("http://purl.org/dc/terms/");
const RDF = Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
const RDFS = Namespace("http://www.w3.org/2000/01/rdf-schema#");
const WDT = Namespace("http://www.wikidata.org/prop/direct/");
const WD = Namespace("http://www.wikidata.org/entity/");
const LDP = Namespace("http://www.w3.org/ns/ldp#");
const ACL = Namespace("http://www.w3.org/ns/auth/acl#");
const AUTH = Namespace("http://www.example.org/vocab/datev/auth#");
const AS = Namespace("https://www.w3.org/ns/activitystreams#");
const XSD = Namespace("http://www.w3.org/2001/XMLSchema#");
const ETHON = Namespace("http://ethon.consensys.net/");
const PDGR = Namespace("http://purl.org/pedigree#");
const LDCV = Namespace("http://people.aifb.kit.edu/co1683/2019/ld-chain/vocab#");
const WILD = Namespace("http://purl.org/wild/vocab#");
const VCARD = Namespace("http://www.w3.org/2006/vcard/ns#");
const GDPRP = Namespace("https://solid.ti.rw.fau.de/public/ns/gdpr-purposes#");
const PUSH = Namespace("https://purl.org/solid-web-push/vocab#");
const SEC = Namespace("https://w3id.org/security#");
const SPACE = Namespace("http://www.w3.org/ns/pim/space#");
const SVCS = Namespace("https://purl.org/solid-vc/credentialStatus#");
const CREDIT = Namespace("http://example.org/vocab/datev/credit#");
const SCHEMA = Namespace("http://schema.org/");
const INTEROP = Namespace("http://www.w3.org/ns/solid/interop#");
const SKOS = Namespace("http://www.w3.org/2004/02/skos/core#");
const ORG = Namespace("http://www.w3.org/ns/org#");
const MANDAT = Namespace("https://solid.aifb.kit.edu/vocab/mandat/");
const AD = Namespace("https://www.example.org/advertisement/");
const SHAPETREE = Namespace("https://solid.aifb.kit.edu/shapes/mandat/businessAssessment.tree#");


/***/ }),

/***/ 433:
/***/ (function(__unused_webpack_module, exports) {

var __webpack_unused_export__;

__webpack_unused_export__ = ({ value: true });
// runtime helper for setting properties on components
// in a tree-shakable way
exports.A = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
        target[key] = val;
    }
    return target;
};


/***/ }),

/***/ 742:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__742__;

/***/ }),

/***/ 603:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__603__;

/***/ }),

/***/ 907:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__907__;

/***/ }),

/***/ 380:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__380__;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	!function() {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = function(module) {
/******/ 			var getter = module && module.__esModule ?
/******/ 				function() { return module['default']; } :
/******/ 				function() { return module; };
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	!function() {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = function(exports, definition) {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	!function() {
/******/ 		__webpack_require__.o = function(obj, prop) { return Object.prototype.hasOwnProperty.call(obj, prop); }
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	!function() {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = function(exports) {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	!function() {
/******/ 		__webpack_require__.p = "";
/******/ 	}();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "default": function() { return /* binding */ entry_lib; }
});

;// CONCATENATED MODULE: ../../node_modules/@vue/cli-service/lib/commands/build/setPublicPath.js
/* eslint-disable no-var */
// This file is imported into lib/wc client bundles.

if (typeof window !== 'undefined') {
  var currentScript = window.document.currentScript
  if (false) { var getCurrentScript; }

  var src = currentScript && currentScript.src.match(/(.+\/)[^/]+\.js(\?.*)?$/)
  if (src) {
    __webpack_require__.p = src[1] // eslint-disable-line
  }
}

// Indicate to webpack that this file can be concatenated
/* harmony default export */ var setPublicPath = (null);

// EXTERNAL MODULE: external "vue"
var external_vue_ = __webpack_require__(380);
;// CONCATENATED MODULE: ../../node_modules/thread-loader/dist/cjs.js!../../node_modules/ts-loader/index.js??clonedRuleSet-83.use[1]!../../node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[3]!../../node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./src/LogoutButton.vue?vue&type=template&id=79d8ba55&ts=true

const _hoisted_1 = /*#__PURE__*/ (0,external_vue_.createElementVNode)("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "20",
    height: "20",
    fill: "none",
    viewBox: "0 0 20 20"
}, [
    /*#__PURE__*/ (0,external_vue_.createElementVNode)("path", {
        fill: "#003D66",
        "fill-opacity": ".9",
        d: "M13 5v3H5v4h8v3l5.25-5L13 5Z"
    }),
    /*#__PURE__*/ (0,external_vue_.createElementVNode)("path", {
        fill: "#61C7F2",
        d: "M14 7.333 16.8 10 14 12.667V11H6V9h8V7.333Z"
    }),
    /*#__PURE__*/ (0,external_vue_.createElementVNode)("path", {
        fill: "#3B3B3B",
        "fill-opacity": ".9",
        d: "M2 3V1H1v18h1V3Z"
    })
], -1);
function render(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_Button = (0,external_vue_.resolveComponent)("Button");
    return ((0,external_vue_.openBlock)(), (0,external_vue_.createElementBlock)("div", {
        class: "logout-button",
        onClick: _cache[0] || (_cache[0] = ($event) => (_ctx.session.logout()))
    }, [
        (0,external_vue_.renderSlot)(_ctx.$slots, "default", {}, () => [
            (0,external_vue_.createVNode)(_component_Button, { class: "p-button-text p-button-rounded ml-1" }, {
                default: (0,external_vue_.withCtx)(() => [
                    _hoisted_1
                ]),
                _: 1
            })
        ])
    ]));
}

;// CONCATENATED MODULE: ./src/LogoutButton.vue?vue&type=template&id=79d8ba55&ts=true

;// CONCATENATED MODULE: ../composables/src/useCache.ts
const cache = {};
const useCache = () => cache;

;// CONCATENATED MODULE: ../composables/src/useServiceWorkerNotifications.ts

const hasActivePush = (0,external_vue_.ref)(false);
/** ask the user for permission to display notifications */
const askForNotificationPermission = async () => {
    const status = await Notification.requestPermission();
    console.log("### PWA  \t| Notification permission status:", status);
    return status;
};
/**
 * We should perform this check whenever the user accesses our app
 * because subscription objects may change during their lifetime.
 * We need to make sure that it is synchronized with our server.
 * If there is no subscription object we can update our UI
 * to ask the user if they would like receive notifications.
 */
const _checkSubscription = async () => {
    if (!("serviceWorker" in navigator)) {
        throw new Error("Service Worker not in Navigator");
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) {
        throw new Error(`No Subscription`); // Update UI to ask user to register for Push
    }
    return sub; // We have a subscription, update the database
};
// Notification.permission == "granted" && await _checkSubscription()
const _hasActivePush = async () => {
    return Notification.permission == "granted" && await _checkSubscription().then(() => true).catch(() => false);
};
_hasActivePush().then(hasPush => hasActivePush.value = hasPush);
/** It's best practice to call the ``subscribeUser()` function
 * in response to a user action signalling they would like to
 * subscribe to push messages from our app.
 */
const subscribeToPush = async (pubKey) => {
    if (Notification.permission != "granted") {
        throw new Error("Notification permission not granted");
    }
    if (!("serviceWorker" in navigator)) {
        throw new Error("Service Worker not in Navigator");
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg?.pushManager.subscribe({
        userVisibleOnly: true, // demanded by chrome
        applicationServerKey: pubKey, // "TODO :) VAPID Public Key (e.g. from Pod Server)",
    });
    /*
     * userVisibleOnly:
     * A boolean indicating that the returned push subscription will only be used
     * for messages whose effect is made visible to the user.
     */
    /*
     * applicationServerKey:
     * A Base64-encoded DOMString or ArrayBuffer containing an ECDSA P-256 public key
     * that the push server will use to authenticate your application server
     * Note: This parameter is required in some browsers like Chrome and Edge.
     */
    if (!sub) {
        throw new Error(`Subscription failed: Sub == ${sub}`);
    }
    console.log("### PWA  \t| Subscription created!");
    hasActivePush.value = true;
    return sub.toJSON();
};
const unsubscribeFromPush = async () => {
    const sub = await _checkSubscription();
    const isUnsubbed = await sub.unsubscribe();
    console.log("### PWA  \t| Subscription cancelled:", isUnsubbed);
    hasActivePush.value = false;
    return sub.toJSON();
};
const useServiceWorkerNotifications_useServiceWorkerNotifications = () => {
    return {
        askForNotificationPermission,
        subscribeToPush,
        unsubscribeFromPush,
        hasActivePush,
    };
};

;// CONCATENATED MODULE: ../composables/src/useServiceWorkerUpdate.ts

const hasUpdatedAvailable = (0,external_vue_.ref)(false);
let registration;
// Store the SW registration so we can send it a message
// We use `updateExists` to control whatever alert, toast, dialog, etc we want to use
// To alert the user there is an update they need to refresh for
const updateAvailable = (event) => {
    registration = event.detail;
    hasUpdatedAvailable.value = true;
};
// Called when the user accepts the update
const refreshApp = () => {
    hasUpdatedAvailable.value = false;
    // Make sure we only send a 'skip waiting' message if the SW is waiting
    if (!registration || !registration.waiting)
        return;
    // send message to SW to skip the waiting and activate the new SW
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
};
// Listen for our custom event from the SW registration
if ('addEventListener' in document) {
    document.addEventListener("serviceWorkerUpdated", updateAvailable, {
        once: true,
    });
}
let isRefreshing = false;
// this must not be in the service worker, since it will be updated ;-)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (isRefreshing)
            return;
        isRefreshing = true;
        window.location.reload();
    });
}
const useServiceWorkerUpdate = () => {
    return {
        hasUpdatedAvailable,
        refreshApp,
    };
};

// EXTERNAL MODULE: ../composables/src/useSolidProfile.ts
var useSolidProfile = __webpack_require__(585);
// EXTERNAL MODULE: ../composables/src/useSolidSession.ts
var src_useSolidSession = __webpack_require__(400);
// EXTERNAL MODULE: ../solid/index.ts + 7 modules
var solid = __webpack_require__(273);
;// CONCATENATED MODULE: ../composables/src/useSolidWebPush.ts



let useSolidWebPush_unsubscribeFromPush;
let useSolidWebPush_subscribeToPush;
let session;
// hardcoding for my demo
const solidWebPushProfile = "https://solid.aifb.kit.edu/web-push/service";
// usually this should expect the resource to sub to, then check their .meta and so on...
const _getSolidWebPushDetails = async () => {
    const { store } = await getResource(solidWebPushProfile)
        .then((resp) => resp.data)
        .then((txt) => parseToN3(txt, solidWebPushProfile));
    const service = store.getSubjects(AS("Service"), null, null)[0];
    const inbox = store.getObjects(service, LDP("inbox"), null)[0].value;
    const vapidPublicKey = store.getObjects(service, PUSH("vapidPublicKey"), null)[0].value;
    return { inbox, vapidPublicKey };
};
const _createSubscriptionOnResource = (uri, details) => {
    return `
@prefix rdf: <${RDF()}> .
@prefix as: <${AS()}> .
@prefix push: <${PUSH()}> .
<#sub> a as:Follow;
    as:actor <${session.webId}>;
    as:object <${uri}>;
    push:endpoint "${details.endpoint}";
    # expirationTime: null # undefined
    push:keys [
            push:auth "${details.keys.auth}";
			      push:p256dh "${details.keys.p256dh}"
		    ].    
    `;
};
const _createUnsubscriptionFromResource = (uri, details) => {
    return `
@prefix rdf: <${RDF()}> .
@prefix as: <${AS()}> .
@prefix push: <${PUSH()}> .
<#unsub> a as:Undo;
    as:actor <${session.webId}>;
    as:object [
            a as:Follow;
            as:actor <${session.webId}>;
            as:object <${uri}>;
            push:endpoint "${details.endpoint}";
            # expirationTime: null # undefined
            push:keys [
                    push:auth "${details.keys.auth}";
		        	      push:p256dh "${details.keys.p256dh}"
		                  ]
              ].    
    `;
};
const subscribeForResource = async (uri) => {
    const { inbox, vapidPublicKey } = await _getSolidWebPushDetails();
    const sub = await useSolidWebPush_subscribeToPush(vapidPublicKey);
    const solidWebPushSub = _createSubscriptionOnResource(uri, sub);
    console.log(solidWebPushSub);
    return createResource(inbox, solidWebPushSub, session);
};
const unsubscribeFromResource = async (uri) => {
    const { inbox } = await _getSolidWebPushDetails();
    const sub_old = await useSolidWebPush_unsubscribeFromPush();
    const solidWebPushUnSub = _createUnsubscriptionFromResource(uri, sub_old);
    console.log(solidWebPushUnSub);
    return createResource(inbox, solidWebPushUnSub, session);
};
const useSolidWebPush = () => {
    if (!session) {
        session = useSolidSession().session;
    }
    if (!useSolidWebPush_unsubscribeFromPush && !useSolidWebPush_subscribeToPush) {
        const { unsubscribeFromPush: unsubscribeFromPushFunc, subscribeToPush: subscribeToPushFunc } = useServiceWorkerNotifications();
        useSolidWebPush_unsubscribeFromPush = unsubscribeFromPushFunc;
        useSolidWebPush_subscribeToPush = subscribeToPushFunc;
    }
    return {
        subscribeForResource,
        unsubscribeFromResource
    };
};

// EXTERNAL MODULE: ../composables/src/webPushSubscription.ts
var webPushSubscription = __webpack_require__(141);
// EXTERNAL MODULE: ../composables/src/useIsLoggedIn.ts
var useIsLoggedIn = __webpack_require__(632);
// EXTERNAL MODULE: ../composables/src/rdpCapableSession.ts
var rdpCapableSession = __webpack_require__(0);
;// CONCATENATED MODULE: ../composables/index.ts



// export * from './src/useSolidInbox';


// export * from './src/useSolidWallet';





;// CONCATENATED MODULE: ../../node_modules/thread-loader/dist/cjs.js!../../node_modules/ts-loader/index.js??clonedRuleSet-83.use[1]!../../node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./src/LogoutButton.vue?vue&type=script&lang=ts


/* harmony default export */ var LogoutButtonvue_type_script_lang_ts = ((0,external_vue_.defineComponent)({
    name: "LoginButton",
    setup() {
        const { session } = (0,src_useSolidSession.useSolidSession)();
        return { session };
    },
}));

;// CONCATENATED MODULE: ./src/LogoutButton.vue?vue&type=script&lang=ts
 
// EXTERNAL MODULE: ../../node_modules/vue-loader/dist/exportHelper.js
var exportHelper = __webpack_require__(433);
;// CONCATENATED MODULE: ./src/LogoutButton.vue




;
const __exports__ = /*#__PURE__*/(0,exportHelper/* default */.A)(LogoutButtonvue_type_script_lang_ts, [['render',render]])

/* harmony default export */ var LogoutButton = (__exports__);
;// CONCATENATED MODULE: ../../node_modules/@vue/cli-service/lib/commands/build/entry-lib.js


/* harmony default export */ var entry_lib = (LogoutButton);


__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=LogoutButton.umd.js.map