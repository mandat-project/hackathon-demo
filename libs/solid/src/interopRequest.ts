import { createResource, getResource, INTEROP, parseToN3 } from "@shared/solid";
import { AxiosRequestConfig, AxiosResponse } from "axios";
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
  seeAlso: string[];
  hasAccessNeedGroup: AccessNeedGroup[];
  purpose: string[];
};

export async function createResourceInAnyRegistrationOfShape(
  webId: string,
  shapeTreeUri: string,
  resourceBody: string,
  axiosFetch?: (
    config: AxiosRequestConfig<any>,
    dpopPayload?: any
  ) => Promise<AxiosResponse<any, any>>
) {
  const offerContainerUris = (
    await getDataRegistrationContainers(webId, shapeTreeUri, axiosFetch)
  )[0];
  return await createResource(offerContainerUris, resourceBody, axiosFetch);
}

export async function getDataRegistrationContainers(
  webId: string,
  shapeTreeUri: string,
  axiosFetch?: (
    config: AxiosRequestConfig<any>,
    dpopPayload?: any
  ) => Promise<AxiosResponse<any, any>>
): Promise<string[]> {
  const registrySetUris = await getRegistrySet(webId, axiosFetch);
  const dataRegistryUris = [];
  for (const registrySetUri of registrySetUris) {
    dataRegistryUris.push(
      ...(await getDataRegistry(registrySetUri, axiosFetch))
    );
  }
  const dataRegistrationUris = [];
  for (const dataRegistryUri of dataRegistryUris) {
    dataRegistrationUris.push(
      ...(await getDataRegistrations(dataRegistryUri, axiosFetch))
    );
  }
  const dataRegistrationsOfShapeUris = [];
  for (const dataRegistrationUri of dataRegistrationUris) {
    const hasMatchingShape = await filterDataRegistrationUrisByShapeTreeUri(
      dataRegistrationUri,
      shapeTreeUri,
      axiosFetch
    );
    if (hasMatchingShape) {
      dataRegistrationsOfShapeUris.push(dataRegistrationUri);
    }
  }
  return dataRegistrationsOfShapeUris;
}

function getRegistrySet(
  webId: string,
  axiosFetch?: (
    config: AxiosRequestConfig<any>,
    dpopPayload?: any
  ) => Promise<AxiosResponse<any, any>>
): Promise<string[]> {
  return getResourceAsStore(webId, axiosFetch).then((store) =>
    store
      .getObjects(null, INTEROP("hasRegistrySet"), null)
      .map((term) => term.value)
  );
}

function getDataRegistry(
  registrySetUri: string,
  axiosFetch?: (
    config: AxiosRequestConfig<any>,
    dpopPayload?: any
  ) => Promise<AxiosResponse<any, any>>
): Promise<string[]> {
  return getResourceAsStore(registrySetUri, axiosFetch).then((store) =>
    store
      .getObjects(null, INTEROP("hasDataRegistry"), null)
      .map((term) => term.value)
  );
}

async function getDataRegistrations(
  dataRegistryUri: string,
  axiosFetch?: (
    config: AxiosRequestConfig<any>,
    dpopPayload?: any
  ) => Promise<AxiosResponse<any, any>>
): Promise<string[]> {
  return getResourceAsStore(dataRegistryUri, axiosFetch).then((store) =>
    store
      .getObjects(null, INTEROP("hasDataRegistration"), null)
      .map((term) => term.value)
  );
}

function getRegisteredShapeTree(
  dataRegistrationUri: string,
  axiosFetch?: (
    config: AxiosRequestConfig<any>,
    dpopPayload?: any
  ) => Promise<AxiosResponse<any, any>>
): Promise<string> {
  return getResourceAsStore(dataRegistrationUri, axiosFetch).then(
    (store) =>
      store.getObjects(null, INTEROP("registeredShapeTree"), null)[0].value
  );
}

async function filterDataRegistrationUrisByShapeTreeUri(
  dataRegistrationUri: string,
  shapeTreeUri: string,
  axiosFetch?: (
    config: AxiosRequestConfig<any>,
    dpopPayload?: any
  ) => Promise<AxiosResponse<any, any>>
) {
  const dataRegistrationShapeTree = await getRegisteredShapeTree(
    dataRegistrationUri,
    axiosFetch
  );
  return dataRegistrationShapeTree === shapeTreeUri;
}

function getResourceAsStore(
  uri: string,
  axiosFetch?: (
    config: AxiosRequestConfig<any>,
    dpopPayload?: any
  ) => Promise<AxiosResponse<any, any>>
): Promise<Store> {
  return getResource(uri, axiosFetch)
    .then((resp) => resp.data)
    .then((txt) => parseToN3(txt, uri))
    .then((parsedN3) => parsedN3.store);
}
