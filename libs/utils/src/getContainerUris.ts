import {getDataRegistrationContainers} from "@datev-research/mandat-shared-solid-interop";
import {Session} from "@datev-research/mandat-shared-solid-oidc";

export async function getContainerUris(webId: string, shapeTreeUri: string, session: Session): Promise<string[]> {
    return await getDataRegistrationContainers(
        webId,
        shapeTreeUri,
        session
    );
}
