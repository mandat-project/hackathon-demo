"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContainerUris = getContainerUris;
const solid_1 = require("hackathon-demo/libs/solid");
async function getContainerUris(webId, shapeTreeUri, session) {
    return await (0, solid_1.getDataRegistrationContainers)(webId, shapeTreeUri, session);
}
