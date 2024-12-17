export function toAdvertisementImage(adName: string): string {
    switch (adName.split('#')[1]) {
        case "CreditConsumerAdShape": return require('../assets/private-loan-logo.svg');
        case "CreditEnterpriseAdShape": return require('../assets/business-loan-logo.svg');
        default: return require('../assets/logo.svg');
    }
}
