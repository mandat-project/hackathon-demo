import { Store } from "n3";
import {INTEROP} from "./namespaces";
import {Session} from "./solid-oidc-client-browser/Session";
import {createResource, getResource, parseToN3} from "./solidRequests";

export type AccessNeed = {
  uri: string;
  accessNeedDescriptionLabel: string[];
  accessNeedDescriptionDefinition: string[];
  accessMode: string[];
  registeredShapeTree: string[];
  hasDataInstance: string[];
  accessNecessity: string[];
};

export type AccessNeedGroup = {
  uri: string;
  accessNeedGroupDescriptionLabel: string[];
  accessNeedGroupDescriptionDefinition: string[];
  hasAccessNeed: AccessNeed[];
};

export type AccessRequest = {
  uri: string;
  toSocialAgent: string[];
  fromSocialAgent: string[];
  seeAlso: string[];
  hasAccessNeedGroup: AccessNeedGroup[];
  purpose: string[];
};

export async function createResourceInAnyRegistrationOfShape(
  webId: string,
  shapeTreeUri: string,
  resourceBody: string,
  session?:Session
) {
  if (session === undefined) session = new Session();
  const offerContainerUris = (
    await getDataRegistrationContainers(webId, shapeTreeUri, session)
  )[0];
  return await createResource(offerContainerUris, resourceBody, session);
}

export async function getDataRegistrationContainers(
  webId: string,
  shapeTreeUri: string,
  session?:Session
): Promise<string[]> {
  if (session === undefined) session = new Session();
  const registrySetUris = await getRegistrySet(webId, session);
  const dataRegistryUris = [];
  for (const registrySetUri of registrySetUris) {
    dataRegistryUris.push(
      ...(await getDataRegistry(registrySetUri, session))
    );
  }
  const dataRegistrationUris = [];
  for (const dataRegistryUri of dataRegistryUris) {
    dataRegistrationUris.push(
      ...(await getDataRegistrations(dataRegistryUri, session))
    );
  }
  const dataRegistrationsOfShapeUris = [];
  for (const dataRegistrationUri of dataRegistrationUris) {
    const hasMatchingShape = await filterDataRegistrationUrisByShapeTreeUri(
      dataRegistrationUri,
      shapeTreeUri,
      session
    );
    if (hasMatchingShape) {
      dataRegistrationsOfShapeUris.push(dataRegistrationUri);
    }
  }
  return dataRegistrationsOfShapeUris;
}

function getRegistrySet(
  webId: string,
  session?:Session
): Promise<string[]> {
  if (session === undefined) session = new Session();
  return getResourceAsStore(webId, session).then((store) =>
    store
      .getObjects(null, INTEROP("hasRegistrySet"), null)
      .map((term) => term.value)
  );
}

function getDataRegistry(
  registrySetUri: string,
  session?:Session
): Promise<string[]> {
  if (session === undefined) session = new Session();
  return getResourceAsStore(registrySetUri, session).then((store) =>
    store
      .getObjects(null, INTEROP("hasDataRegistry"), null)
      .map((term) => term.value)
  );
}

async function getDataRegistrations(
  dataRegistryUri: string,
  session?:Session
): Promise<string[]> {
  if (session === undefined) session = new Session();
  return getResourceAsStore(dataRegistryUri, session).then((store) =>
    store
      .getObjects(null, INTEROP("hasDataRegistration"), null)
      .map((term) => term.value)
  );
}

function getRegisteredShapeTree(
  dataRegistrationUri: string,
  session?:Session
): Promise<string> {
  if (session === undefined) session = new Session();
  return getResourceAsStore(dataRegistrationUri, session).then(
    (store) =>
      store.getObjects(null, INTEROP("registeredShapeTree"), null)[0].value
  );
}

async function filterDataRegistrationUrisByShapeTreeUri(
  dataRegistrationUri: string,
  shapeTreeUri: string,
  session?:Session
) {
  if (session === undefined) session = new Session();
  const dataRegistrationShapeTree = await getRegisteredShapeTree(
    dataRegistrationUri,
    session
  );
  return dataRegistrationShapeTree === shapeTreeUri;
}

function getResourceAsStore(
  uri: string,
  session?:Session
): Promise<Store> {
  if (session === undefined) session = new Session();
  return getResource(uri, session)
    .then((resp) => resp.data)
    .then((txt) => parseToN3(txt, uri))
    .then((parsedN3) => parsedN3.store);
}
