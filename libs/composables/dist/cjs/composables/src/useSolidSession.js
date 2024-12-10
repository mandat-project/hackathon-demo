"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSolidSession = void 0;
const vue_1 = require("vue");
const rdpCapableSession_1 = require("./rdpCapableSession");
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
    session ??= (0, vue_1.inject)('useSolidSession:RdpCapableSession', () => (0, vue_1.reactive)(new rdpCapableSession_1.RdpCapableSession("")), true);
    return {
        session,
        restoreSession,
    };
};
exports.useSolidSession = useSolidSession;
