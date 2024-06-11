import {AS, createResource, getResource, LDP, parseToN3, PUSH, RDF} from "@shared/solid";
import {toRefs} from "vue";
import {useServiceWorkerNotifications} from "./useServiceWorkerNotifications";
import {useSolidSession} from "./useSolidSession";

const {unsubscribeFromPush, subscribeToPush} =
    useServiceWorkerNotifications();

const {sessionInfo, authFetch} = useSolidSession();
const {webId} = toRefs(sessionInfo);

interface WebPushSubscription {
    endpoint: string;
    keys: {
        auth: string;
        p256dh: string;
    };
}

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
    as:actor <${webId?.value}>;
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
    as:actor <${webId?.value}>;
    as:object [
            a as:Follow;
            as:actor <${webId?.value}>;
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
    const sub = await subscribeToPush(vapidPublicKey);
    //@ts-ignore
    const solidWebPushSub = _createSubscriptionOnResource(uri, sub);
    console.log(solidWebPushSub)
    return createResource(inbox, solidWebPushSub, authFetch.value);
};

const unsubscribeFromResource = async (uri: string) => {
    const {inbox} = await _getSolidWebPushDetails();
    const sub_old = await unsubscribeFromPush();
    //@ts-ignore
    const solidWebPushUnSub = _createUnsubscriptionFromResource(uri, sub_old);
    console.log(solidWebPushUnSub)
    return createResource(inbox, solidWebPushUnSub, authFetch.value);
};

export const useSolidWebPush = () => {
    return {
        subscribeForResource,
        unsubscribeFromResource
    };
};
