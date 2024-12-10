import { WebPushSubscription } from "./webPushSubscription";
/** ask the user for permission to display notifications */
export declare const askForNotificationPermission: () => Promise<NotificationPermission>;
export declare const useServiceWorkerNotifications: () => {
    askForNotificationPermission: () => Promise<NotificationPermission>;
    subscribeToPush: (pubKey: string) => Promise<WebPushSubscription>;
    unsubscribeFromPush: () => Promise<WebPushSubscription>;
    hasActivePush: import("vue").Ref<boolean>;
};
