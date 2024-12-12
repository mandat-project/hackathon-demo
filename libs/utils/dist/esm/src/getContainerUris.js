import { getDataRegistrationContainers } from "@datev-research/mandat-shared-solid-interop";
export async function getContainerUris(webId, shapeTreeUri, session) {
    return await getDataRegistrationContainers(webId, shapeTreeUri, session);
}
