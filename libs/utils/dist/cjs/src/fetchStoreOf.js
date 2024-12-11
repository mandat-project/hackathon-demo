"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchStoreOf = fetchStoreOf;
const mandat_shared_solid_requests_1 = require("@datev-research/mandat-shared-solid-requests");
async function fetchStoreOf(uri, session) {
    return (0, mandat_shared_solid_requests_1.getResource)(uri, session)
        .then((resp) => resp.data)
        .then((txt) => (0, mandat_shared_solid_requests_1.parseToN3)(txt, uri))
        .then((parsedN3) => parsedN3.store);
}
