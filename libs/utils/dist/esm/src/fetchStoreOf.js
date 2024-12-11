import { getResource, parseToN3 } from "@datev-research/mandat-shared-solid-requests";
export async function fetchStoreOf(uri, session) {
    return getResource(uri, session)
        .then((resp) => resp.data)
        .then((txt) => parseToN3(txt, uri))
        .then((parsedN3) => parsedN3.store);
}
