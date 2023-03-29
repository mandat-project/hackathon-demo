import {getResource, INTEROP, parseToN3} from "@shared/solid";
import {Quad_Object, Store} from "n3";

type Fetch = typeof fetch;

export async function getDataRegistrationContainers(webId: string, shapeTreeUri: string, authFetch?: Fetch): Promise<Array<string>> {

    let dataRegistrationContainerUris: Array<string> = [];

    const registrySetUri = await getRegistrySet(webId, authFetch)
        .then(getQuadValue)

    if (registrySetUri) {
        const dataRegistryUri = await getDataRegistry(registrySetUri, authFetch)
            .then(getQuadValue)

        if (dataRegistryUri) {
            const dataRegistrationUris = await getDataRegistrations(dataRegistryUri, authFetch)
                .then(dataRegistrations => dataRegistrations.map(getQuadValue));

            dataRegistrationContainerUris = await filterDataRegistrationUrisByShapeTreeUri(dataRegistrationUris, shapeTreeUri, authFetch)
        }
    }

    return dataRegistrationContainerUris;
}

async function filterDataRegistrationUrisByShapeTreeUri(dataRegistrationUris: Array<string>, shapeTreeUri: string, authFetch?: Fetch) {
    const result: Array<string> = [];
    for (const dataRegistrationUri of dataRegistrationUris) {
        await getRegisteredShapeTree(dataRegistrationUri, authFetch)
            .then(getQuadValue)
            .then(dataRegistrationShapeTree => {
                if (dataRegistrationShapeTree === shapeTreeUri) {
                    result.push(dataRegistrationUri);
                }
            })
    }
    return result;
}

function getRegistrySet(webId: string, authFetch?: Fetch): Promise<Quad_Object> {
    return getResourceAsStore(webId, authFetch)
        .then(store => store.getObjects(null, INTEROP('hasRegistrySet'), null)[0]);
}

function getDataRegistry(registrySetUri: string, authFetch?: Fetch): Promise<Quad_Object> {
    return getResourceAsStore(registrySetUri, authFetch)
        .then(store => store.getObjects(null, INTEROP('hasDataRegistry'), null)[0]);

}

function getDataRegistrations(dataRegistryUri: string, authFetch?: Fetch): Promise<Array<Quad_Object>> {
    return getResourceAsStore(dataRegistryUri, authFetch)
        .then(store => store.getObjects(null, INTEROP('hasDataRegistration'), null));
}

function getRegisteredShapeTree(dataRegistrationUri: string, authFetch?: Fetch): Promise<Quad_Object> {
    return getResourceAsStore(dataRegistrationUri, authFetch)
        .then(store => store.getObjects(null, INTEROP('registeredShapeTree'), null)[0]);
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