import {Session} from "@datev-research/mandat-shared-solid-oidc";
import {getResource, parseToN3} from "@datev-research/mandat-shared-solid-requests";
import {Store} from "n3";

export async function fetchStoreOf(uri: string, session: Session): Promise<Store> {
    return getResource(uri, session)
        .then((resp) => resp.data)
        .then((txt) => parseToN3(txt, uri))
        .then((parsedN3) => parsedN3.store);
}
