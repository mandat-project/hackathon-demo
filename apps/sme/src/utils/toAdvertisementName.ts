export function toAdvertisementName(adName: string): string {
    switch (adName.split('#')[1]) {
        case "CreditConsumerAdShape": return 'Private Loan';
        case "CreditEnterpriseAdShape": return 'Business Loan';
        default: return adName;
    }
}
