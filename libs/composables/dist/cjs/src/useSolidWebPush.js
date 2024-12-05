"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSolidWebPush = void 0;
const solid_1 = require("hackathon-demo/libs/solid");
const useServiceWorkerNotifications_1 = require("./useServiceWorkerNotifications");
const useSolidSession_1 = require("./useSolidSession");
let unsubscribeFromPush;
let subscribeToPush;
let session;
// hardcoding for my demo
const solidWebPushProfile = "https://solid.aifb.kit.edu/web-push/service";
// usually this should expect the resource to sub to, then check their .meta and so on...
const _getSolidWebPushDetails = async () => {
    const { store } = await (0, solid_1.getResource)(solidWebPushProfile)
        .then((resp) => resp.data)
        .then((txt) => (0, solid_1.parseToN3)(txt, solidWebPushProfile));
    const service = store.getSubjects((0, solid_1.AS)("Service"), null, null)[0];
    const inbox = store.getObjects(service, (0, solid_1.LDP)("inbox"), null)[0].value;
    const vapidPublicKey = store.getObjects(service, (0, solid_1.PUSH)("vapidPublicKey"), null)[0].value;
    return { inbox, vapidPublicKey };
};
const _createSubscriptionOnResource = (uri, details) => {
    return `
@prefix rdf: <${(0, solid_1.RDF)()}> .
@prefix as: <${(0, solid_1.AS)()}> .
@prefix push: <${(0, solid_1.PUSH)()}> .
<#sub> a as:Follow;
    as:actor <${session.webId}>;
    as:object <${uri}>;
    push:endpoint "${details.endpoint}";
    # expirationTime: null # undefined
    push:keys [
            push:auth "${details.keys.auth}";
			      push:p256dh "${details.keys.p256dh}"
		    ].    
    `;
};
const _createUnsubscriptionFromResource = (uri, details) => {
    return `
@prefix rdf: <${(0, solid_1.RDF)()}> .
@prefix as: <${(0, solid_1.AS)()}> .
@prefix push: <${(0, solid_1.PUSH)()}> .
<#unsub> a as:Undo;
    as:actor <${session.webId}>;
    as:object [
            a as:Follow;
            as:actor <${session.webId}>;
            as:object <${uri}>;
            push:endpoint "${details.endpoint}";
            # expirationTime: null # undefined
            push:keys [
                    push:auth "${details.keys.auth}";
		        	      push:p256dh "${details.keys.p256dh}"
		                  ]
              ].    
    `;
};
const subscribeForResource = async (uri) => {
    const { inbox, vapidPublicKey } = await _getSolidWebPushDetails();
    const sub = await subscribeToPush(vapidPublicKey);
    const solidWebPushSub = _createSubscriptionOnResource(uri, sub);
    console.log(solidWebPushSub);
    return (0, solid_1.createResource)(inbox, solidWebPushSub, session);
};
const unsubscribeFromResource = async (uri) => {
    const { inbox } = await _getSolidWebPushDetails();
    const sub_old = await unsubscribeFromPush();
    const solidWebPushUnSub = _createUnsubscriptionFromResource(uri, sub_old);
    console.log(solidWebPushUnSub);
    return (0, solid_1.createResource)(inbox, solidWebPushUnSub, session);
};
const useSolidWebPush = () => {
    if (!session) {
        session = (0, useSolidSession_1.useSolidSession)().session;
    }
    if (!unsubscribeFromPush && !subscribeToPush) {
        const { unsubscribeFromPush: unsubscribeFromPushFunc, subscribeToPush: subscribeToPushFunc } = (0, useServiceWorkerNotifications_1.useServiceWorkerNotifications)();
        unsubscribeFromPush = unsubscribeFromPushFunc;
        subscribeToPush = subscribeToPushFunc;
    }
    return {
        subscribeForResource,
        unsubscribeFromResource
    };
};
exports.useSolidWebPush = useSolidWebPush;
