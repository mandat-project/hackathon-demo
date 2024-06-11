import { computed, ref, watch } from "vue";
import { useSolidSession } from "./useSolidSession";
import {
  getResource,
  INTEROP,
  LDP,
  parseToN3,
  SPACE,
  VCARD,
} from "@shared/solid";
import { Store } from "n3";

const { authFetch, sessionInfo } = useSolidSession();

const name = ref("");
const img = ref("");
const inbox = ref("");
const storage = ref("");
const authAgent = ref("");
const accessInbox = ref("");

watch(
  () => sessionInfo.webId,
  async () => {
    const webId = sessionInfo.webId as string;
    let store = new Store();
    if (sessionInfo.webId !== undefined) {
      store = await getResource(webId, authFetch.value)
        .then((resp) => resp.data)
        .then((respText) => parseToN3(respText, webId))
        .then((parsedN3) => parsedN3.store);
    }
    let query = store.getObjects(webId, VCARD("hasPhoto"), null);
    img.value = query.length > 0 ? query[0].value : "";
    query = store.getObjects(webId, VCARD("fn"), null);
    name.value = query.length > 0 ? query[0].value : "";
    query = store.getObjects(webId, LDP("inbox"), null);
    inbox.value = query.length > 0 ? query[0].value : "";
    query = store.getObjects(webId, SPACE("storage"), null);
    storage.value = query.length > 0 ? query[0].value : "";
    query = store.getObjects(webId, INTEROP("hasAuthorizationAgent"), null);
    authAgent.value = query.length > 0 ? query[0].value : "";
    query = store.getObjects(webId, INTEROP("hasAccessInbox"), null);
    accessInbox.value = query.length > 0 ? query[0].value : "";
  }
);

const wallet = computed(() =>
  storage.value !== "" ? `${storage.value}wallet/` : ""
);
const credStatusDir = computed(() =>
  storage.value !== "" ? `${storage.value}credentialStatus/` : ""
);
const authorizationRegistry = computed(() =>
  storage.value !== "" ? `${storage.value}authorization-registry/` : ""
);

export const useSolidProfile = () => {
  return {
    name,
    img,
    inbox,
    storage,
    wallet,
    credStatusDir,
    authAgent,
    accessInbox,
    authorizationRegistry,
  };
};
