import { getResource, INTEROP, LDP, MANDAT, ORG, parseToN3, SPACE, VCARD, } from "hackathon-demo/libs/solid";
import { Store } from "n3";
import { ref, watch } from "vue";
import { useSolidSession } from "./useSolidSession";
let session;
const name = ref("");
const img = ref("");
const inbox = ref("");
const storage = ref("");
const authAgent = ref("");
const accessInbox = ref("");
const memberOf = ref("");
const hasOrgRDP = ref("");
export const useSolidProfile = () => {
    if (!session) {
        const { session: sessionRef } = useSolidSession();
        session = sessionRef;
    }
    watch(() => session.webId, async () => {
        const webId = session.webId;
        let store = new Store();
        if (session.webId !== undefined) {
            store = await getResource(webId)
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
        query = store.getObjects(webId, ORG("memberOf"), null);
        const uncheckedMemberOf = query.length > 0 ? query[0].value : "";
        if (uncheckedMemberOf !== "") {
            let storeOrg = new Store();
            storeOrg = await getResource(uncheckedMemberOf)
                .then((resp) => resp.data)
                .then((respText) => parseToN3(respText, uncheckedMemberOf))
                .then((parsedN3) => parsedN3.store);
            const isMember = storeOrg.getQuads(uncheckedMemberOf, ORG("hasMember"), webId, null).length > 0;
            if (isMember) {
                memberOf.value = uncheckedMemberOf;
                query = storeOrg.getObjects(uncheckedMemberOf, MANDAT("hasRightsDelegationProxy"), null);
                hasOrgRDP.value = query.length > 0 ? query[0].value : "";
                session.updateSessionWithRDP(hasOrgRDP.value);
                // and also overwrite fields from org profile
                query = storeOrg.getObjects(memberOf.value, VCARD("fn"), null);
                name.value += ` (Org: ${query.length > 0 ? query[0].value : "N/A"})`;
                query = storeOrg.getObjects(memberOf.value, LDP("inbox"), null);
                inbox.value = query.length > 0 ? query[0].value : "";
                query = storeOrg.getObjects(memberOf.value, SPACE("storage"), null);
                storage.value = query.length > 0 ? query[0].value : "";
                query = storeOrg.getObjects(memberOf.value, INTEROP("hasAuthorizationAgent"), null);
                authAgent.value = query.length > 0 ? query[0].value : "";
                query = storeOrg.getObjects(memberOf.value, INTEROP("hasAccessInbox"), null);
                accessInbox.value = query.length > 0 ? query[0].value : "";
            }
        }
    });
    return {
        name, img, inbox, storage, authAgent, accessInbox, memberOf, hasOrgRDP,
    };
};
