"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createResourceInAnyRegistrationOfShape = createResourceInAnyRegistrationOfShape;
exports.getDataRegistrationContainers = getDataRegistrationContainers;
const namespaces_1 = require("./namespaces");
const Session_1 = require("./solid-oidc-client-browser/Session");
const solidRequests_1 = require("./solidRequests");
async function createResourceInAnyRegistrationOfShape(webId, shapeTreeUri, resourceBody, session) {
    if (session === undefined)
        session = new Session_1.Session();
    const offerContainerUris = (await getDataRegistrationContainers(webId, shapeTreeUri, session))[0];
    return await (0, solidRequests_1.createResource)(offerContainerUris, resourceBody, session);
}
async function getDataRegistrationContainers(webId, shapeTreeUri, session) {
    if (session === undefined)
        session = new Session_1.Session();
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
        session = new Session_1.Session();
    return getResourceAsStore(webId, session).then((store) => store
        .getObjects(null, (0, namespaces_1.INTEROP)("hasRegistrySet"), null)
        .map((term) => term.value));
}
function getDataRegistry(registrySetUri, session) {
    if (session === undefined)
        session = new Session_1.Session();
    return getResourceAsStore(registrySetUri, session).then((store) => store
        .getObjects(null, (0, namespaces_1.INTEROP)("hasDataRegistry"), null)
        .map((term) => term.value));
}
async function getDataRegistrations(dataRegistryUri, session) {
    if (session === undefined)
        session = new Session_1.Session();
    return getResourceAsStore(dataRegistryUri, session).then((store) => store
        .getObjects(null, (0, namespaces_1.INTEROP)("hasDataRegistration"), null)
        .map((term) => term.value));
}
function getRegisteredShapeTree(dataRegistrationUri, session) {
    if (session === undefined)
        session = new Session_1.Session();
    return getResourceAsStore(dataRegistrationUri, session).then((store) => store.getObjects(null, (0, namespaces_1.INTEROP)("registeredShapeTree"), null)[0].value);
}
async function filterDataRegistrationUrisByShapeTreeUri(dataRegistrationUri, shapeTreeUri, session) {
    if (session === undefined)
        session = new Session_1.Session();
    const dataRegistrationShapeTree = await getRegisteredShapeTree(dataRegistrationUri, session);
    return dataRegistrationShapeTree === shapeTreeUri;
}
function getResourceAsStore(uri, session) {
    if (session === undefined)
        session = new Session_1.Session();
    return (0, solidRequests_1.getResource)(uri, session)
        .then((resp) => resp.data)
        .then((txt) => (0, solidRequests_1.parseToN3)(txt, uri))
        .then((parsedN3) => parsedN3.store);
}
