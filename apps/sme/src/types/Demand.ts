import {Offer} from "@/types/Offer";
import {Order} from "@/types/Order";

export interface Demand {
    id: string;
    providerName: string;
    providerWebID: string;
    amount: number;
    currency: string;
    offer?: Offer;
    order?: Order;
    hasAccessRequest: string;
    isAccessRequestGranted: string;
    documentCreationDemand: string;
}
