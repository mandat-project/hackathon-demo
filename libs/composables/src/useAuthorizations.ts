import {useSolidProfile, useSolidSession} from "@shared/composables";
import {
    AUTH,
    createContainer,
    createResource,
    FOAF,
    GDPRP,
    getContainerItems,
    getLocationHeader,
    getResource,
    INTEROP,
    parseToN3,
    RDF,
    RDFS,
    XSD
} from "@shared/solid";
import {Store} from "n3";
import {computed, ref, watch} from "vue";

export const useAuthorizations = () => {
    const {session} = useSolidSession();
    const {accessInbox, storage} = useSolidProfile();

    // keep track of access requests
    const accessRequestInformationResources = ref<string[]>([]);

    // keep track of access receipts
    const accessReceiptInformationResources = ref<string[]>([]);

    // concrete access request URI (optional)
    const inspectedAccessRequestURI = ref<string | null>(null);

    // create data authorization container if needed
    const dataAuthzContainerName = "data-authorizations"
    const dataAuthzContainer = computed(() => storage.value + dataAuthzContainerName + "/");

    // create access authorization container if needed
    const accessAuthzContainerName = "authorization-registry"
    const accessAuthzContainer = computed(() => storage.value + accessAuthzContainerName + "/");

    // create access authorization container if needed
    const accessAuthzArchiveContainerName = "authorization-archive"
    const accessAuthzArchiveContainer = computed(() => storage.value + accessAuthzArchiveContainerName + "/");

    // create access receipt container if needed
    const accessReceiptContainerName = "authorization-receipts"
    const accessReceiptContainer = computed(() => storage.value + accessReceiptContainerName + "/");

    const _accessReceiptLocalName = "accessReceipt";

    const reload = () => {
        refreshAccessRequestInformationResources()
        refreshAccessReceiptInformationResources();
    };

    watch(storage, async () => {
        if (!storage.value) {
            return
        }
        getResource(dataAuthzContainer.value, session)
            .catch(() => createContainer(storage.value, dataAuthzContainerName, session))
            .catch((err) => {
                console.info({
                    severity: "error",
                    summary: "Failed to create Data Authorization Container!",
                    detail: err,
                    life: 5000,
                });
                throw new Error(err);
            })
        getResource(accessAuthzContainer.value, session)
            .catch(() => createContainer(storage.value, accessAuthzContainerName, session))
            .catch((err) => {
                console.info({
                    severity: "error",
                    summary: "Failed to create Access Authorization Container!",
                    detail: err,
                    life: 5000,
                });
                throw new Error(err);
            })
        getResource(accessAuthzArchiveContainer.value, session)
            .catch(() => createContainer(storage.value, accessAuthzArchiveContainerName, session))
            .catch((err) => {
                console.info({
                    severity: "error", summary: "Failed to create Access Receipt Container!", detail: err, life: 5000,
                });
                throw new Error(err);
            })
        getResource(accessReceiptContainer.value, session)
            .catch(() => createContainer(storage.value, accessReceiptContainerName, session))
            .catch((err) => {
                console.info({
                    severity: "error", summary: "Failed to create Access Receipt Container!", detail: err, life: 5000,
                });
                throw new Error(err);
            })
    }, {immediate: true});

    // once an access inbox is available, get the access requests from there
    // except when we have a specific access request to focus on. then only focus on that one.
    watch(accessInbox, () => {
        reload();
    }, {immediate: true});

    /**
     * Retrieve access requests from an access inbox
     * @param accessInbox
     */
    async function getAccessRequestInformationResources(accessInbox: string) {
        if (!accessInbox) {
            return [];
        }
        if (inspectedAccessRequestURI.value) {
            return [inspectedAccessRequestURI.value.split('#')[0]]
        }
        return await getContainerItems(accessInbox, session)
    }

    /**
     * get the access receipts
     */
    async function getAccessReceiptInformationResources() {
        return await getContainerItems(accessReceiptContainer.value, session)
    }

    /**
     * get the access receipt(s) of accessRequestURI
     */
    async function getAccessReceiptInformationResourcesForAccessRequest(accessRequestURI: string) {
        const accessReceiptStore = new Store();
        const accessReceiptContainerItems = await getAccessReceiptInformationResources();
        await _fillItemStoresIntoStore(accessReceiptContainerItems, accessReceiptStore)

        return accessReceiptStore.getSubjects(AUTH("hasAccessRequest"), accessRequestURI, null).map(subject => subject.value);
    }

    async function getAccessRequest(uri: string) {
        const store: Store = await _fetchStoreOf(uri);

        //

        const accessRequest = store.getSubjects(RDF("type"), INTEROP("AccessRequest"), null).map(t => t.value)[0];
        const purposes = store.getObjects(accessRequest, GDPRP('purposeForProcessing'), null).map(t => t.value);
        const fromSocialAgents = store.getObjects(accessRequest, INTEROP("fromSocialAgent"), null).map(t => t.value);

        const _forSocialAgentsDirect = store.getObjects(accessRequest, INTEROP("forSocialAgent"), null).map(t => t.value);
        const forSocialAgents = _forSocialAgentsDirect.length ? _forSocialAgentsDirect : fromSocialAgents;

        const seeAlso = store.getObjects(accessRequest, RDFS("seeAlso"), null).map(t => t.value);
        const accessNeedGroups = store.getObjects(accessRequest, INTEROP("hasAccessNeedGroup"), null).map(t => t.value);

        //

        const senderStore: Store = await _fetchStoreOf(fromSocialAgents[0]);
        const granteeStore: Store = await _fetchStoreOf(forSocialAgents[0]);

        //

        const senderName = senderStore.getObjects(null, FOAF("name"), null)[0]?.value;
        const granteeName = granteeStore.getObjects(null, FOAF("name"), null)[0]?.value;

        //

        /**
         * Trigger children access need groups to create access authorization and trigger their children,
         * wait until all children have done so,
         * then create access receipt and emit finish event to parent,
         * if redirect present,
         * redirect
         */
        async function grantWithAccessReceipt(accessAuthorizations: string[], redirect?: string) {
            // create access receipt
            const accessReceiptLocation = await _createAccessReceipt(
                [...accessAuthorizations]
            );

            // emit to overview
            const associatedAccessReceipt = `${accessReceiptLocation}#${_accessReceiptLocalName}`

            // redirect if wanted
            if (redirect) {
                window.open(
                    `${redirect}?uri=${encodeURIComponent(
                        accessRequest
                    )}&result=${accessAuthorizations.length ? 1 : 0}`,
                    "_self"
                );
            }

            return associatedAccessReceipt;
        }

        /**
         * Decline a request.
         * Create an access receipt that does not link to any access authorizations
         */
        async function declineWithAccessReceipt(redirect?: string) {
            return grantWithAccessReceipt([], redirect);
        }

        /**
         *  Create a new access receipt.
         *
         * ? This could potentially be extracted to a library.
         *
         * @param accessAuthorizations
         */
        async function _createAccessReceipt(
            accessAuthorizations: string[]
        ) {
            const date = new Date().toISOString();
            let payload = `
    @prefix interop:<${INTEROP()}> .
    @prefix xsd:<${XSD()}> .
    @prefix auth:<${AUTH()}> .

    <#${_accessReceiptLocalName}>
      a interop:AccessReceipt ;
      interop:providedAt "${date}"^^xsd:dateTime ;
      auth:hasAccessRequest <${accessRequest}>`;
            if (accessAuthorizations.length > 0) {
                payload += `
    ;
      interop:hasAccessAuthorization ${accessAuthorizations
                    .map((t) => "<" + t + ">")
                    .join(", ")}`;
            }
            payload += ' .'
            return createResource(accessReceiptContainer.value, payload, session)
                .then((loc) => {
                        console.info({
                            severity: "success",
                            summary: "Access Receipt created.",
                            life: 5000,
                        })
                        return getLocationHeader(loc)
                    }
                )
                .catch((err) => {
                    console.info({
                        severity: "error",
                        summary: "Failed to create Access Receipt!",
                        detail: err,
                        life: 5000,
                    });
                    throw new Error(err);
                })
        }

        return {
            grantWithAccessReceipt,
            declineWithAccessReceipt,

            purposes,
            fromSocialAgents,
            forSocialAgents,
            seeAlso,
            accessNeedGroups,
            senderName,
            granteeName,
        }
    }

    async function refreshAccessRequestInformationResources() {
        const newListOfAccessRequests: string[] = await getAccessRequestInformationResources(accessInbox.value);
        accessRequestInformationResources.value = [...newListOfAccessRequests]
    }

    async function refreshAccessReceiptInformationResources() {
        const newListOfAccessReceipts: string[] = inspectedAccessRequestURI.value ? await getAccessReceiptInformationResourcesForAccessRequest(inspectedAccessRequestURI.value) : await getAccessReceiptInformationResources();
        accessReceiptInformationResources.value = [...newListOfAccessReceipts];
    }


    /*
     * Util Functions
     * @private
     */

    async function _fillItemStoresIntoStore(itemUris: string[], store: Store) {
        const itemStores: Store[] = await Promise.all(itemUris.map((item) => _fetchStoreOf(item)))
        itemStores
            .map(itemStore => itemStore.getQuads(null, null, null, null))
            .map((quads) => store.addQuads(quads))
    }

    async function _fetchStoreOf(uri: string): Promise<Store> {
        return getResource(uri, session)
            .catch((err) => {
                console.info({
                    severity: "error", summary: `Error on fetching: ${uri}`, detail: err, life: 5000,
                });
                throw new Error(err);
            })
            .then((resp) => resp.data)
            .then((txt) => parseToN3(txt, uri))
            .then((parsedN3) => parsedN3.store);
    }

    return {
        reload,
        refreshAccessReceiptInformationResources,
        getAccessRequest,
        accessRequestInformationResources,
        accessReceiptInformationResources,
        dataAuthzContainer,
        accessAuthzContainer,
        accessAuthzArchiveContainer,
        accessReceiptContainer,
    }
}
