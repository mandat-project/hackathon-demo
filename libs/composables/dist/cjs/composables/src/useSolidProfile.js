"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSolidProfile = void 0;
const solid_1 = require("hackathon-demo/libs/solid");
const n3_1 = require("n3");
const vue_1 = require("vue");
const useSolidSession_1 = require("./useSolidSession");
let session;
const name = (0, vue_1.ref)("");
const img = (0, vue_1.ref)("");
const inbox = (0, vue_1.ref)("");
const storage = (0, vue_1.ref)("");
const authAgent = (0, vue_1.ref)("");
const accessInbox = (0, vue_1.ref)("");
const memberOf = (0, vue_1.ref)("");
const hasOrgRDP = (0, vue_1.ref)("");
const useSolidProfile = () => {
    if (!session) {
        const { session: sessionRef } = (0, useSolidSession_1.useSolidSession)();
        session = sessionRef;
    }
    (0, vue_1.watch)(() => session.webId, async () => {
        const webId = session.webId;
        let store = new n3_1.Store();
        if (session.webId !== undefined) {
            store = await (0, solid_1.getResource)(webId)
                .then((resp) => resp.data)
                .then((respText) => (0, solid_1.parseToN3)(respText, webId))
                .then((parsedN3) => parsedN3.store);
        }
        let query = store.getObjects(webId, (0, solid_1.VCARD)("hasPhoto"), null);
        img.value = query.length > 0 ? query[0].value : "";
        query = store.getObjects(webId, (0, solid_1.VCARD)("fn"), null);
        name.value = query.length > 0 ? query[0].value : "";
        query = store.getObjects(webId, (0, solid_1.LDP)("inbox"), null);
        inbox.value = query.length > 0 ? query[0].value : "";
        query = store.getObjects(webId, (0, solid_1.SPACE)("storage"), null);
        storage.value = query.length > 0 ? query[0].value : "";
        query = store.getObjects(webId, (0, solid_1.INTEROP)("hasAuthorizationAgent"), null);
        authAgent.value = query.length > 0 ? query[0].value : "";
        query = store.getObjects(webId, (0, solid_1.INTEROP)("hasAccessInbox"), null);
        accessInbox.value = query.length > 0 ? query[0].value : "";
        query = store.getObjects(webId, (0, solid_1.ORG)("memberOf"), null);
        const uncheckedMemberOf = query.length > 0 ? query[0].value : "";
        if (uncheckedMemberOf !== "") {
            let storeOrg = new n3_1.Store();
            storeOrg = await (0, solid_1.getResource)(uncheckedMemberOf)
                .then((resp) => resp.data)
                .then((respText) => (0, solid_1.parseToN3)(respText, uncheckedMemberOf))
                .then((parsedN3) => parsedN3.store);
            const isMember = storeOrg.getQuads(uncheckedMemberOf, (0, solid_1.ORG)("hasMember"), webId, null).length > 0;
            if (isMember) {
                memberOf.value = uncheckedMemberOf;
                query = storeOrg.getObjects(uncheckedMemberOf, (0, solid_1.MANDAT)("hasRightsDelegationProxy"), null);
                hasOrgRDP.value = query.length > 0 ? query[0].value : "";
                session.updateSessionWithRDP(hasOrgRDP.value);
                // and also overwrite fields from org profile
                query = storeOrg.getObjects(memberOf.value, (0, solid_1.VCARD)("fn"), null);
                name.value += ` (Org: ${query.length > 0 ? query[0].value : "N/A"})`;
                query = storeOrg.getObjects(memberOf.value, (0, solid_1.LDP)("inbox"), null);
                inbox.value = query.length > 0 ? query[0].value : "";
                query = storeOrg.getObjects(memberOf.value, (0, solid_1.SPACE)("storage"), null);
                storage.value = query.length > 0 ? query[0].value : "";
                query = storeOrg.getObjects(memberOf.value, (0, solid_1.INTEROP)("hasAuthorizationAgent"), null);
                authAgent.value = query.length > 0 ? query[0].value : "";
                query = storeOrg.getObjects(memberOf.value, (0, solid_1.INTEROP)("hasAccessInbox"), null);
                accessInbox.value = query.length > 0 ? query[0].value : "";
            }
        }
    });
    return {
        name, img, inbox, storage, authAgent, accessInbox, memberOf, hasOrgRDP,
    };
};
exports.useSolidProfile = useSolidProfile;
