import {Session} from "@datev-research/mandat-shared-solid-oidc";
import {AS, createResource, getResource, LDP, parseToN3, PUSH, RDF} from "@datev-research/mandat-shared-solid-requests";
import {useServiceWorkerNotifications} from "./useServiceWorkerNotifications";
import {useSolidSession} from "./useSolidSession";
import {WebPushSubscription} from "./webPushSubscription";

let unsubscribeFromPush!: Function;
let subscribeToPush!: Function;
let session!: Session;

// hardcoding for my demo
const solidWebPushProfile = "https://solid.aifb.kit.edu/web-push/service";

// usually this should expect the resource to sub to, then check their .meta and so on...
const _getSolidWebPushDetails = async () => {
    const {store} = await getResource(solidWebPushProfile)
        .then((resp) => resp.data)
        .then((txt) => parseToN3(txt, solidWebPushProfile));
    const service = store.getSubjects(AS("Service"), null, null)[0];
    const inbox = store.getObjects(service, LDP("inbox"), null)[0].value;
    const vapidPublicKey = store.getObjects(
        service,
        PUSH("vapidPublicKey"),
        null
    )[0].value;
    return {inbox, vapidPublicKey};
};

const _createSubscriptionOnResource = (
    uri: string,
    details: WebPushSubscription
) => {
    return `
@prefix rdf: <${RDF()}> .
@prefix as: <${AS()}> .
@prefix push: <${PUSH()}> .
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

const _createUnsubscriptionFromResource = (
    uri: string,
    details: WebPushSubscription
) => {
    return `
@prefix rdf: <${RDF()}> .
@prefix as: <${AS()}> .
@prefix push: <${PUSH()}> .
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

const subscribeForResource = async (uri: string) => {
    const {inbox, vapidPublicKey} = await _getSolidWebPushDetails();
    const sub: WebPushSubscription = await subscribeToPush(vapidPublicKey);
    const solidWebPushSub = _createSubscriptionOnResource(uri, sub);
    console.log(solidWebPushSub)
    return createResource(inbox, solidWebPushSub, session);
};

const unsubscribeFromResource = async (uri: string) => {
    const {inbox} = await _getSolidWebPushDetails();
    const sub_old = await unsubscribeFromPush();
    const solidWebPushUnSub = _createUnsubscriptionFromResource(uri, sub_old);
    console.log(solidWebPushUnSub)
    return createResource(inbox, solidWebPushUnSub, session);
};

export const useSolidWebPush = () => {
    if (!session) {
        session = useSolidSession().session;
    }
    if (!unsubscribeFromPush && !subscribeToPush) {
        const {unsubscribeFromPush: unsubscribeFromPushFunc, subscribeToPush: subscribeToPushFunc} = useServiceWorkerNotifications();
        unsubscribeFromPush = unsubscribeFromPushFunc;
        subscribeToPush = subscribeToPushFunc;
    }

    return {
        subscribeForResource,
        unsubscribeFromResource
    };
};
