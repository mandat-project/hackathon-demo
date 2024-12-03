"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchStoreOf = fetchStoreOf;
const solid_1 = require("hackathon-demo/libs/solid");
async function fetchStoreOf(uri, session) {
    return (0, solid_1.getResource)(uri, session)
        .then((resp) => resp.data)
        .then((txt) => (0, solid_1.parseToN3)(txt, uri))
        .then((parsedN3) => parsedN3.store);
}
