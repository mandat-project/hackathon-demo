import { createResource, getResource, INTEROP, parseToN3 } from "@shared/solid";
import { Store } from "n3";

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
  fromDemand: string[];
  hasAccessNeedGroup: AccessNeedGroup[];
  purpose: string[];
};

export async function createResourceInAnyRegistrationOfShape(
  webId: string,
  shapeTreeUri: string,
  resourceBody: string,
  fetch?: (url: RequestInfo, init?: RequestInit) => Promise<Response>
) {
  const offerContainerUris = (
    await getDataRegistrationContainers(webId, shapeTreeUri, fetch)
  )[0];
  return await createResource(offerContainerUris, resourceBody, fetch);
}

export async function getDataRegistrationContainers(
  webId: string,
  shapeTreeUri: string,
  fetch?: (url: RequestInfo, init?: RequestInit) => Promise<Response>
): Promise<string[]> {
  const registrySetUris = await getRegistrySet(webId, fetch);
  const dataRegistryUris = [];
  for (const registrySetUri of registrySetUris) {
    dataRegistryUris.push(...(await getDataRegistry(registrySetUri, fetch)));
  }
  const dataRegistrationUris = [];
  for (const dataRegistryUri of dataRegistryUris) {
    dataRegistrationUris.push(
      ...(await getDataRegistrations(dataRegistryUri, fetch))
    );
  }
  const dataRegistrationsOfShapeUris = [];
  for (const dataRegistrationUri of dataRegistrationUris) {
    const hasMatchingShape = await filterDataRegistrationUrisByShapeTreeUri(
      dataRegistrationUri,
      shapeTreeUri,
      fetch
    );
    if (hasMatchingShape) {
      dataRegistrationsOfShapeUris.push(dataRegistrationUri);
    }
  }
  return dataRegistrationsOfShapeUris;
}

function getRegistrySet(
  webId: string,
  fetch?: (url: RequestInfo, init?: RequestInit) => Promise<Response>
): Promise<string[]> {
  return getResourceAsStore(webId, fetch).then((store) =>
    store
      .getObjects(null, INTEROP("hasRegistrySet"), null)
      .map((term) => term.value)
  );
}

function getDataRegistry(
  registrySetUri: string,
  fetch?: (url: RequestInfo, init?: RequestInit) => Promise<Response>
): Promise<string[]> {
  return getResourceAsStore(registrySetUri, fetch).then((store) =>
    store
      .getObjects(null, INTEROP("hasDataRegistry"), null)
      .map((term) => term.value)
  );
}

async function getDataRegistrations(
  dataRegistryUri: string,
  fetch?: (url: RequestInfo, init?: RequestInit) => Promise<Response>
): Promise<string[]> {
  return getResourceAsStore(dataRegistryUri, fetch).then((store) =>
    store
      .getObjects(null, INTEROP("hasDataRegistration"), null)
      .map((term) => term.value)
  );
}

function getRegisteredShapeTree(
  dataRegistrationUri: string,
  fetch?: (url: RequestInfo, init?: RequestInit) => Promise<Response>
): Promise<string> {
  return getResourceAsStore(dataRegistrationUri, fetch).then(
    (store) =>
      store.getObjects(null, INTEROP("registeredShapeTree"), null)[0].value
  );
}

async function filterDataRegistrationUrisByShapeTreeUri(
  dataRegistrationUri: string,
  shapeTreeUri: string,
  fetch?: (url: RequestInfo, init?: RequestInit) => Promise<Response>
) {
  const dataRegistrationShapeTree = await getRegisteredShapeTree(
    dataRegistrationUri,
    fetch
  );
  return dataRegistrationShapeTree === shapeTreeUri;
}

function getResourceAsStore(
  uri: string,
  fetch?: (url: RequestInfo, init?: RequestInit) => Promise<Response>
): Promise<Store> {
  return getResource(uri, fetch)
    .then((resp) => resp.text())
    .then((txt) => parseToN3(txt, uri))
    .then((parsedN3) => parsedN3.store);
}
