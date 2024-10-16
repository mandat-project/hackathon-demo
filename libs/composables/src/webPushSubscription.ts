export interface WebPushSubscription {
    endpoint: string;
    keys: {
        auth: string;
        p256dh: string;
    };
}
