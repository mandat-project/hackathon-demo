import { Session } from "./solid-oidc-client-browser/Session";
export type AccessNeed = {
    uri: string;
    accessNeedDescriptionLabel: string[];
    accessNeedDescriptionDefinition: string[];
    accessMode: string[];
    registeredShapeTree: string[];
    hasDataInstance: string[];
    accessNecessity: string[];
};
export type AccessNeedGroup = {
    uri: string;
    accessNeedGroupDescriptionLabel: string[];
    accessNeedGroupDescriptionDefinition: string[];
    hasAccessNeed: AccessNeed[];
};
export type AccessRequest = {
    uri: string;
    toSocialAgent: string[];
    fromSocialAgent: string[];
    seeAlso: string[];
    hasAccessNeedGroup: AccessNeedGroup[];
    purpose: string[];
};
export declare function createResourceInAnyRegistrationOfShape(webId: string, shapeTreeUri: string, resourceBody: string, session?: Session): Promise<import("axios").AxiosResponse<any, any>>;
export declare function getDataRegistrationContainers(webId: string, shapeTreeUri: string, session?: Session): Promise<string[]>;
