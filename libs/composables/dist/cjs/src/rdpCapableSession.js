"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RdpCapableSession = void 0;
const mandat_shared_solid_oidc_1 = require("@datev-research/mandat-shared-solid-oidc");
class RdpCapableSession extends mandat_shared_solid_oidc_1.Session {
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
exports.RdpCapableSession = RdpCapableSession;
