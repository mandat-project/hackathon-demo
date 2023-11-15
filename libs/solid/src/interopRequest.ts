import { getResource, INTEROP, parseToN3 } from "@shared/solid";
import { Quad, Quad_Object, Store } from "n3";

type Fetch = typeof fetch;

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

export async function getDataRegistrationContainers(
  webId: string,
  shapeTreeUri: string,
  authFetch?: Fetch
): Promise<Array<string>> {
  let dataRegistrationContainerUris: Array<string> = [];

  const registrySetUri = await getRegistrySet(webId, authFetch).then(
    getQuadValue
  );

  if (registrySetUri) {
    const dataRegistryUris = await getDataRegistry(
      registrySetUri,
      authFetch
    ).then((dataRegistry) => dataRegistry.map(getQuadValue));

    if (dataRegistryUris) {
      const dataRegistrationUris = await getDataRegistrations(
        dataRegistryUris,
        authFetch
      );

      dataRegistrationContainerUris =
        await filterDataRegistrationUrisByShapeTreeUri(
          dataRegistrationUris,
          shapeTreeUri,
          authFetch
        );
    }
  }

  return dataRegistrationContainerUris;
}

async function filterDataRegistrationUrisByShapeTreeUri(
  dataRegistrationUris: Array<string>,
  shapeTreeUri: string,
  authFetch?: Fetch
) {
  const result: Array<string> = [];
  for (const dataRegistrationUri of dataRegistrationUris) {
    await getRegisteredShapeTree(dataRegistrationUri, authFetch)
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
  authFetch?: Fetch
): Promise<Quad_Object> {
  return getResourceAsStore(webId, authFetch).then(
    (store) => store.getObjects(null, INTEROP("hasRegistrySet"), null)[0]
  );
}

function getDataRegistry(
  registrySetUri: string,
  authFetch?: Fetch
): Promise<Array<Quad_Object>> {
  return getResourceAsStore(registrySetUri, authFetch).then((store) =>
    store.getObjects(null, INTEROP("hasDataRegistry"), null)
  );
}

async function getDataRegistrations(
  dataRegistryUris: string[],
  authFetch?: Fetch
): Promise<string[]> {
  const result: string[] = [];
  for (const dataRegistryUri of dataRegistryUris) {
    await getResourceAsStore(dataRegistryUri, authFetch)
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
  authFetch?: Fetch
): Promise<Quad_Object> {
  return getResourceAsStore(dataRegistrationUri, authFetch).then(
    (store) => store.getObjects(null, INTEROP("registeredShapeTree"), null)[0]
  );
}

function getResourceAsStore(uri: string, authFetch?: Fetch): Promise<Store> {
  return getResource(uri, authFetch)
    .then((resp) => resp.text())
    .then((txt) => parseToN3(txt, uri))
    .then((parsedN3) => parsedN3.store);
}

function getQuadValue(quad: Quad_Object): string {
  return quad.value;
}
