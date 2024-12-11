import { Session } from "@datev-research/mandat-shared-solid-oidc";
import { Store } from "n3";
export declare function fetchStoreOf(uri: string, session: Session): Promise<Store>;
