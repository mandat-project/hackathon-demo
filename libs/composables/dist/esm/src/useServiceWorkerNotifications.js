import { ref } from "vue";
const hasActivePush = ref(false);
/** ask the user for permission to display notifications */
export const askForNotificationPermission = async () => {
    const status = await Notification.requestPermission();
    console.log("### PWA  \t| Notification permission status:", status);
    return status;
};
/**
 * We should perform this check whenever the user accesses our app
 * because subscription objects may change during their lifetime.
 * We need to make sure that it is synchronized with our server.
 * If there is no subscription object we can update our UI
 * to ask the user if they would like receive notifications.
 */
const _checkSubscription = async () => {
    if (!("serviceWorker" in navigator)) {
        throw new Error("Service Worker not in Navigator");
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) {
        throw new Error(`No Subscription`); // Update UI to ask user to register for Push
    }
    return sub; // We have a subscription, update the database
};
// Notification.permission == "granted" && await _checkSubscription()
const _hasActivePush = async () => {
    return Notification.permission == "granted" && await _checkSubscription().then(() => true).catch(() => false);
};
_hasActivePush().then(hasPush => hasActivePush.value = hasPush);
/** It's best practice to call the ``subscribeUser()` function
 * in response to a user action signalling they would like to
 * subscribe to push messages from our app.
 */
const subscribeToPush = async (pubKey) => {
    if (Notification.permission != "granted") {
        throw new Error("Notification permission not granted");
    }
    if (!("serviceWorker" in navigator)) {
        throw new Error("Service Worker not in Navigator");
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg?.pushManager.subscribe({
        userVisibleOnly: true, // demanded by chrome
        applicationServerKey: pubKey, // "TODO :) VAPID Public Key (e.g. from Pod Server)",
    });
    /*
     * userVisibleOnly:
     * A boolean indicating that the returned push subscription will only be used
     * for messages whose effect is made visible to the user.
     */
    /*
     * applicationServerKey:
     * A Base64-encoded DOMString or ArrayBuffer containing an ECDSA P-256 public key
     * that the push server will use to authenticate your application server
     * Note: This parameter is required in some browsers like Chrome and Edge.
     */
    if (!sub) {
        throw new Error(`Subscription failed: Sub == ${sub}`);
    }
    console.log("### PWA  \t| Subscription created!");
    hasActivePush.value = true;
    return sub.toJSON();
};
const unsubscribeFromPush = async () => {
    const sub = await _checkSubscription();
    const isUnsubbed = await sub.unsubscribe();
    console.log("### PWA  \t| Subscription cancelled:", isUnsubbed);
    hasActivePush.value = false;
    return sub.toJSON();
};
export const useServiceWorkerNotifications = () => {
    return {
        askForNotificationPermission,
        subscribeToPush,
        unsubscribeFromPush,
        hasActivePush,
    };
};
