/**
 * Sub-Composable to retrieve Access Request by an URI
 *
 * You can inject this function after "useAuthorizations" was called like:
 *
 * ```typescript
 * const useAccessRequest = inject('useAuthorizations:useAccessRequest');
 * ```
 *
 * @see useAccessNeedGroup
 *
 * @param uri
 * @param redirect
 */
export declare function useAccessRequest(uri: string, redirect?: string): Promise<{
    grantWithAccessReceipt: (overrideAccessAuthorizationsParam?: string[]) => Promise<string>;
    declineWithAccessReceipt: () => Promise<string>;
    grantTrigger: import("vue").Ref<boolean>;
    shapeTreesOfMissingDataRegs: import("vue").Ref<string[]>;
    purposes: string[];
    fromSocialAgents: string[];
    forSocialAgents: string[];
    seeAlso: string[];
    accessNeedGroups: string[];
    senderName: string;
    granteeName: string;
}>;
/**
 * Sub-Composable to retrieve Access Receipts by an URI
 *
 * You can inject this function after "useAuthorizations" was called like:
 *
 * ```typescript
 * const useAccessReceipt = inject('useAuthorizations:useAccessReceipt');
 * ```
 *
 * @param uri
 * @param redirect
 */
export declare function useAccessReceipt(uri: string, redirect?: string): Promise<{
    revokeAccessReceiptRights: () => Promise<void>;
    updateAccessAuthorization: (newAuthorization: string, oldAuthorization: string) => Promise<void>;
    provisionDates: string[];
    accessRequests: string[];
    accessAuthorizations: string[];
    purpose: string;
    isRevokedOrDenied: boolean;
    status: "Active" | "Revoked" | "Denied";
    revokeReceiptIsWaitingForAccessAuthorizations: import("vue").Ref<boolean>;
}>;
/**
 * Sub-Composable to retrieve Access Need Group (Access Authorization) by an URI
 *
 * You can inject this function after "useAuthorizations" was called like:
 *
 * ```typescript
 * const useAccessNeedGroup = inject('useAuthorizations:useAccessNeedGroup');
 * ```
 *
 * @see useAccessNeed
 *
 * @param uri
 * @param forSocialAgents
 */
export declare function useAccessNeedGroup(uri: string, forSocialAgents: string[]): Promise<{
    grantAccessAuthorization: () => Promise<string>;
    grantTrigger: import("vue").Ref<boolean>;
    accessNeeds: string[];
    prefLabels: string[];
    definitions: string[];
}>;
/**
 * Sub-Composable to retrieve Access Authorization by an URI
 *
 * You can inject this function after "useAuthorizations" was called like:
 *
 * ```typescript
 *   const useAccessAuthorization = inject('useAuthorizations:useAccessAuthorization');
 * ```
 *
 * @param uri
 */
export declare function useAccessAuthorization(uri: string, redirect?: string): Promise<{
    revokeAccessAuthorizationRights: () => Promise<void>;
    removeDataAuthorization: (dataAuthorization: string) => Promise<void>;
    grantDates: string[];
    grantees: string[];
    accessNeedGroups: string[];
    dataAuthorizations: string[];
    granteeName: string;
    isWaitingForDataAuthorizations: import("vue").Ref<boolean>;
    revokedDataAuthorizations: import("vue").Ref<string[]>;
}>;
/**
 * Sub-Composable to retrieve Access Need (Data Authorization) by an URI
 *
 * You can inject this function after "useAuthorizations" was called like:
 *
 * ```typescript
 * const useAccessNeed = inject('useAuthorizations:useAccessNeed');
 * ```
 *
 * @param uri
 * @param forSocialAgents
 */
export declare function useAccessNeed(uri: string, forSocialAgents: string[]): Promise<{
    grantDataAuthorization: () => Promise<string | undefined>;
    accessModes: string[];
    registeredShapeTrees: string[];
    dataInstances: string[];
    containers: import("vue").Ref<string[]>;
}>;
/**
 * Sub-Composable to retrieve Data Authorization by an URI
 *
 * You can inject this function after "useAuthorizations" was called like:
 *
 * ```typescript
 *   const useDataAuthorization = inject('useAuthorizations:useDataAuthorization');
 * ```
 *
 * @param uri
 * @param forSocialAgents
 */
export declare function useDataAuthorization(uri: string): Promise<{
    revokeDataAuthorizationRights: () => Promise<void>;
    accessModes: string[];
    registeredShapeTrees: string[];
    dataInstances: string[];
    dataRegistrations: string[];
    grantees: string[];
    scopes: string[];
    accessNeeds: string[];
    granteeName: string;
}>;
/**
 * Composable to work with Access Requests. You can grant and decline incoming access requests.
 *
 * Also note, that for sub-resources like data-authorizations, you can use injections like:
 *
 * ```typescript
 * const useAccessRequest = inject('useAuthorizations:useAccessRequest');
 * const useAccessNeedGroup = inject('useAuthorizations:useAccessNeedGroup');
 * const useAccessNeed = inject('useAuthorizations:useAccessNeed');
 * ```
 * @see useAccessRequest
 * @see useAccessNeedGroup
 * @see useAccessNeed
 *
 * @param uri
 */
export declare const useAuthorizations: (uri?: string) => {
    initialize: () => void;
    reload: () => void;
    accessRequests: import("vue").ComputedRef<string[]>;
    accessReceiptInformationResources: import("vue").Ref<string[]>;
};
