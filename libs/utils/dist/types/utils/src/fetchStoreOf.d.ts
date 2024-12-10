import { Session } from "hackathon-demo/libs/solid";
import { Store } from "n3";
export declare function fetchStoreOf(uri: string, session: Session): Promise<Store>;
