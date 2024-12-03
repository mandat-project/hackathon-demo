import { getDataRegistrationContainers } from "hackathon-demo/libs/solid";
export async function getContainerUris(webId, shapeTreeUri, session) {
    return await getDataRegistrationContainers(webId, shapeTreeUri, session);
}
