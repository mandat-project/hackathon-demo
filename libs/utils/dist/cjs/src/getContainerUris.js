"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContainerUris = getContainerUris;
const mandat_shared_solid_interop_1 = require("@datev-research/mandat-shared-solid-interop");
async function getContainerUris(webId, shapeTreeUri, session) {
    return await (0, mandat_shared_solid_interop_1.getDataRegistrationContainers)(webId, shapeTreeUri, session);
}
