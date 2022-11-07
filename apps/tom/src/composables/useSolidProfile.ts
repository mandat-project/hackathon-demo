import {computed, ref, watch} from "vue";
import {useSolidSession} from "./useSolidSession";
import {getResource, parseToN3} from "@/lib/solidRequests";
import {Store} from "n3";
import {LDP, SPACE, VCARD} from "@/lib/namespaces";

const {authFetch, sessionInfo} = useSolidSession();

const name = ref("");
const img = ref("");
const inbox = ref("");
const storage = ref("")

watch(() => sessionInfo.webId, async () => {
    const webId = sessionInfo.webId as string
    let store = new Store();
    if (sessionInfo.webId !== undefined) {
        store = await getResource(webId, authFetch.value)
            .then((resp) => resp.text())
            .then((respText) => parseToN3(respText, webId))
            .then(parsedN3 => parsedN3.store);
    }
    let query = store.getObjects(webId, VCARD("hasPhoto"), null);
    img.value = query.length > 0 ? query[0].value : "";
    query = store.getObjects(webId, VCARD("fn"), null);
    name.value = query.length > 0 ? query[0].value : "";
    query = store.getObjects(webId, LDP("inbox"), null);
    inbox.value = query.length > 0 ? query[0].value : "";
    query = store.getObjects(webId, SPACE("storage"), null);
    storage.value = query.length > 0 ? query[0].value : "";
})

const wallet = computed(() => storage.value !== "" ? `${storage.value}wallet/` : "");
const credStatusDir = computed(() => storage.value !== "" ? `${storage.value}credentialStatus/` : "");

export const useSolidProfile = () => {
    return {name, img, inbox, storage, wallet, credStatusDir};
};
