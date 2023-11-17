import { createResource, getResource, INTEROP, parseToN3 } from "@shared/solid";
import { Quad_Object, Store } from "n3";

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
): Promise<Array<string>> {
  let dataRegistrationContainerUris: Array<string> = [];

  const registrySetUri = await getRegistrySet(webId, fetch).then(getQuadValue);

  if (registrySetUri) {
    const dataRegistryUris = await getDataRegistry(registrySetUri, fetch).then(
      (dataRegistry) => dataRegistry.map(getQuadValue)
    );

    if (dataRegistryUris) {
      const dataRegistrationUris = await getDataRegistrations(
        dataRegistryUris,
        fetch
      );

      dataRegistrationContainerUris =
        await filterDataRegistrationUrisByShapeTreeUri(
          dataRegistrationUris,
          shapeTreeUri,
          fetch
        );
    }
  }

  return dataRegistrationContainerUris;
}

async function filterDataRegistrationUrisByShapeTreeUri(
  dataRegistrationUris: Array<string>,
  shapeTreeUri: string,
  fetch?: (url: RequestInfo, init?: RequestInit) => Promise<Response>
) {
  const result: Array<string> = [];
  for (const dataRegistrationUri of dataRegistrationUris) {
    await getRegisteredShapeTree(dataRegistrationUri, fetch)
      .then(getQuadValue)
      .then((dataRegistrationShapeTree) => {
        if (dataRegistrationShapeTree === shapeTreeUri) {
          result.push(dataRegistrationUri);
        }
      });
  }
  return result;
}

function getRegistrySet(
  webId: string,
  fetch?: (url: RequestInfo, init?: RequestInit) => Promise<Response>
): Promise<Quad_Object> {
  return getResourceAsStore(webId, fetch).then(
    (store) => store.getObjects(null, INTEROP("hasRegistrySet"), null)[0]
  );
}

function getDataRegistry(
  registrySetUri: string,
  fetch?: (url: RequestInfo, init?: RequestInit) => Promise<Response>
): Promise<Array<Quad_Object>> {
  return getResourceAsStore(registrySetUri, fetch).then((store) =>
    store.getObjects(null, INTEROP("hasDataRegistry"), null)
  );
}

async function getDataRegistrations(
  dataRegistryUris: string[],
  fetch?: (url: RequestInfo, init?: RequestInit) => Promise<Response>
): Promise<string[]> {
  const result: string[] = [];
  for (const dataRegistryUri of dataRegistryUris) {
    await getResourceAsStore(dataRegistryUri, fetch)
      .then((store) =>
        store.getObjects(null, INTEROP("hasDataRegistration"), null)
      )
      .then((x) => x.map(getQuadValue))
      .then((uri) => result.push(...uri));
  }
  return result;
}

function getRegisteredShapeTree(
  dataRegistrationUri: string,
  fetch?: (url: RequestInfo, init?: RequestInit) => Promise<Response>
): Promise<Quad_Object> {
  return getResourceAsStore(dataRegistrationUri, fetch).then(
    (store) => store.getObjects(null, INTEROP("registeredShapeTree"), null)[0]
  );
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

function getQuadValue(quad: Quad_Object): string {
  return quad.value;
}
