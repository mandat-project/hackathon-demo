import {getDataRegistrationContainers, Session} from "hackathon-demo/libs/solid";

export async function getContainerUris(webId: string, shapeTreeUri: string, session: Session): Promise<string[]> {
    return await getDataRegistrationContainers(
        webId,
        shapeTreeUri,
        session
    );
}
