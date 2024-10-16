import {useSolidProfile, useSolidSession} from "@shared/composables";
import {
    ACL,
    AUTH,
    createContainer,
    createResource,
    FOAF,
    GDPRP,
    getAclResourceUri,
    getContainerItems,
    getDataRegistrationContainers,
    getLocationHeader,
    getResource,
    INTEROP,
    LDP,
    ParsedN3,
    parseToN3,
    patchResource,
    RDF,
    RDFS,
    SKOS,
    XSD
} from "@shared/solid";
import {Store} from "n3";
import {computed, ref, watch} from "vue";

export const useAuthorizations = () => {
    const { session } = useSolidSession();
    const { memberOf } = useSolidProfile()

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

    async function getAccessRequest(uri: string, redirect?: string) {
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
        async function grantWithAccessReceipt(accessAuthorizations: string[]) {
            // create access receipt
            const accessReceiptLocation = await _createAccessReceipt(
                [...accessAuthorizations]
            );

            // emit to overview
            const associatedAccessReceipt = `${accessReceiptLocation}#${_accessReceiptLocalName}`

            refreshAccessReceiptInformationResources();

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
        async function declineWithAccessReceipt() {
            return grantWithAccessReceipt([]);
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

    async function getAccessNeedGroup(uri: string, forSocialAgents: string[]) {
        const store = await _fetchStoreOf(uri);

        const accessNeeds = store.getObjects(uri, INTEROP("hasAccessNeed"), null).map(t => t.value)

        /**
         * ! SPEC - data model problem:
         * The access need group only links to the access description set, but from that set, there is no link to any further description.
         * That is, based on an access request, we can not discover its description.
         *
         * So, we assume that we have all knowledge we need and query the data
         */
        const descriptionResources = store.getObjects(uri, INTEROP('hasAccessDescriptionSet'), null).map(t => t.value)

        for (const descriptionResource of descriptionResources) {
            await _fetchN3(descriptionResource).then((parsedN3) => (store.addQuads(parsedN3.store.getQuads(null, null, null, null))));
        }

        const _sthsThatHasAccessNeedGroup = store.getSubjects(INTEROP('hasAccessNeedGroup'), uri, null).map(t => t.value);
        let prefLabels: string[] = [];
        let definitions: string[] = [];
        /**
         * ! SPEC - data model problem:
         * interop:hasAccessNeedGroup
         *  domain -> interop:AccessRequest OR AccessNeedGroupDescription
         */
        for (const sth of _sthsThatHasAccessNeedGroup) {
            const _prefLabels = store.getObjects(sth, SKOS('prefLabel'), null).map(t => t.value);
            if (_prefLabels.length) { prefLabels = _prefLabels; }
            const _definitions = store.getObjects(sth, SKOS('definition'), null).map(t => t.value);
            if (_definitions.length) { definitions = _definitions; }
        }

        //
        // Authorize Access Need Group
        //

        // define a 'local name', i.e. the URI fragment, for the access authorization URI
        const accessAuthzLocalName = "accessAuthorization";

        /**
         * Trigger children access needs to create data authorization and set acls,
         * wait until all children have done so,
         * then create access authorization and emit finish event to parent
         */
        async function grantAccessAuthorization(): Promise<string> {
            // trigger access authorization
            const accessAuthzLocation = await _createAccessAuthorization(
                forSocialAgents,
                // TODO where dataAuthorizations?
                // [...dataAuthorizations.values()]
                [],
            )
            return `${accessAuthzLocation}#${accessAuthzLocalName}`;
        }

        /**
         *  Create a new access authorization.
         *
         * ? This could potentially be extracted to a library.
         *
         * @param forSocialAgents
         * @param dataAuthorizations
         */
        async function _createAccessAuthorization(
            forSocialAgents: string[],
            dataAuthorizations: string[]
        ): Promise<string> {
            const date = new Date().toISOString();
            const payload = `
    @prefix interop:<${INTEROP()}> .
    @prefix xsd:<${XSD()}> .

    <#${accessAuthzLocalName}>
      a interop:AccessAuthorization ;
      interop:grantedBy <${memberOf.value}> ;
      interop:grantedAt "${date}"^^xsd:dateTime ;
      interop:grantee ${forSocialAgents
                .map((t) => "<" + t + ">")
                .join(", ")} ;
      interop:hasAccessNeedGroup <${uri}> ;
      interop:hasDataAuthorization ${dataAuthorizations
                .map((t) => "<" + t + ">")
                .join(", ")} .
`;
            return createResource(accessAuthzContainer.value, payload, session)
                .then((loc) => {
                        console.info({
                            severity: "success",
                            summary: "Access Authorization created.",
                            life: 5000,
                        })
                        return getLocationHeader(loc)
                    }
                )
                .catch((err) => {
                    console.info({
                        severity: "error",
                        summary: "Failed to create Access Authorization!",
                        detail: err,
                        life: 5000,
                    });
                    throw new Error(err);
                })
        }

        return {
            grantAccessAuthorization,

            accessNeeds,
            prefLabels,
            definitions,
        }
    }

    async function getAccessNeed(uri: string, forSocialAgents: string[]) {
        const store = await _fetchStoreOf(uri);
        // define a 'local name', i.e. the URI fragment, for the data authorization URI
        const dataAuthzLocalName = "dataAuthorization";
        const accessModes = store.getObjects(uri, INTEROP("accessMode"), null).map(t => t.value);
        const registeredShapeTrees = store.getObjects(uri, INTEROP("registeredShapeTree"), null).map(t => t.value);
        const dataInstances = store.getObjects(uri, INTEROP("hasDataInstance"), null).map(t => t.value);
        const containers = ref<string[]>([])
        /**
         * ! SPEC - data model problem:
         * The access need does not link to the access description set or similar.
         *
         * The access need group only links to the access description set, but from that set, there is no link to any further description.
         * That is, based on an access request, we can not discover its description.
         *
         * So, we cannot retrieve labels and definitions for acceess needs via graph traversal.
         *
         * One could easily solve such problems by directly describing the access need.
         * Such as it would be correct.
         *
         * The way the spec handles description is incorrect:
         *
         * <#accessNeedGroupDescription>
         a interop:AccessNeedGroupDescription ;
         interop:inAccessDescriptionSet <#accessDescriptionSet> ;
         interop:hasAccessNeedGroup <#accessNeedGroup> ;
         skos:prefLabel "Zugriff Offer und Order container"@de ;

         * means that there is something of type AccessNeedGroupDescription,
         * and the preferred label of that description is "Zugriff ..."
         *
         * Isnt that the preferred label of the access need group? Why the level of indirection?
         */

        await _checkIfMatchingDataRegistrationExists();

        async function _checkIfMatchingDataRegistrationExists() {
            const dataRegistrations = await getDataRegistrationContainers(
                `${memberOf.value}`,
                registeredShapeTrees[0],
                session
            ).catch((err) => {
                console.info({
                    severity: "error",
                    summary: "Error on getDataRegistrationContainers!",
                    detail: err,
                    life: 5000,
                });
                throw new Error(err);
            });
            if (dataRegistrations.length <= 0) {
                // emit("noDataRegistrationFound", registeredShapeTrees[0])
            }
            containers.value = dataRegistrations
        }

        /**
         * Set the .acl for any resource required in this access need.
         */
        async function grantDataAuthorization() {
            // find registries
            for (const shapeTree of registeredShapeTrees) {
                const dataRegistrations = await getDataRegistrationContainers(
                    `${memberOf.value}`,
                    shapeTree,
                    session
                ).catch((err) => {
                    console.info({
                        severity: "error",
                        summary: "Error on getDataRegistrationContainers!",
                        detail: err,
                        life: 5000,
                    });
                    throw new Error(err);
                });
                const dataInstancesForNeed = [] as string[];
                dataInstancesForNeed.push(...dataInstances); // potentially manually edited (added/removed) in auth agent
                const dataAuthzLocation = await createDataAuthorization(forSocialAgents, registeredShapeTrees, accessModes, dataRegistrations, dataInstancesForNeed);
                // if selected data instances given, then only give access to those, else, give to registration
                const accessToResources = dataInstancesForNeed.length > 0 ? dataInstancesForNeed : dataRegistrations;
                // only grant specific resource access
                for (const resource of accessToResources) {
                    await updateAccessControlList(resource, forSocialAgents, accessModes);
                }
                // associatedDataAuthorization.value = (await dataAuthzLocation) + "#" + dataAuthzLocalName
                // emit("createdDataAuthorization", uri, associatedDataAuthorization.value)

                return `${dataAuthzLocation}#${dataAuthzLocalName}`;
            }
        }

        /**
         * Create a new data authorization.
         *
         * ? This could potentially be extracted to a library.
         *
         * @param forSocialAgents
         * @param registeredShapeTrees
         * @param accessModes
         * @param registrations
         * @param instances
         */
        async function createDataAuthorization(
            forSocialAgents: string[],
            registeredShapeTrees: string[],
            accessModes: string[],
            registrations: string[],
            instances?: string[]
        ) {
            const payload = `
    @prefix interop:<${INTEROP()}> .
    @prefix ldp:<${LDP()}> .
    @prefix xsd:<${XSD()}> .
    @prefix acl:<${ACL()}> .
    @prefix auth:<${AUTH()}> .

    <#${dataAuthzLocalName}>
      a interop:DataAuthorization ;
      interop:grantee ${forSocialAgents
                .map((t: string) => "<" + t + ">")
                .join(", ")} ;
      interop:registeredShapeTree ${registeredShapeTrees
                .map((t) => "<" + t + ">")
                .join(", ")} ;
      interop:accessMode ${accessModes
                .map((t) => "<" + t + ">")
                .join(", ")} ;
      interop:scopeOfAuthorization  ${instances && instances.length > 0
                ? "interop:SelectedFromRegistry"
                : "interop:AllFromRegistry"
            } ;
      interop:hasDataRegistration ${registrations
                .map((t) => "<" + t + ">")
                .join(", ")} ;
      ${instances && instances.length > 0
                ? "interop:hasDataInstance " +
                instances.map((t) => "<" + t + ">").join(", ") +
                " ;"
                : ""
            }
      interop:satisfiesAccessNeed <${uri}> .`;

            return createResource(dataAuthzContainer.value, payload, session)
                .then((loc) => {
                        console.info({
                            severity: "success",
                            summary: "Data Authorization created.",
                            life: 5000,
                        })
                        return getLocationHeader(loc)
                    }
                )
                .catch((err) => {
                    console.info({
                        severity: "error",
                        summary: "Failed to create Data Authorization!",
                        detail: err,
                        life: 5000,
                    });
                    throw new Error(err);
                })
        }


        /**
         * Set the .acl according to the access need.
         * Make sure that the owner has still control as well.
         *
         * ? This could potentially be extracted to a library.
         *
         * @param accessTo
         * @param agent
         * @param mode
         */
        async function updateAccessControlList(
            accessTo: string,
            agent: string[],
            mode: string[]
        ) {

            const patchBody = `
@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix acl: <http://www.w3.org/ns/auth/acl#>.

_:rename a solid:InsertDeletePatch;
    solid:inserts {
        <#owner> a acl:Authorization;
            acl:accessTo <.${accessTo.substring(accessTo.lastIndexOf('/'))}>;
            acl:agent <${memberOf.value}>;
            acl:default <.${accessTo.substring(accessTo.lastIndexOf('/'))}>;
            acl:mode acl:Read, acl:Write, acl:Control.

        <#grantee-${new Date().toISOString()}>
            a acl:Authorization;
            acl:accessTo <.${accessTo.substring(accessTo.lastIndexOf('/'))}>;
            acl:agent ${agent.map((a) => "<" + a + ">").join(", ")};
            acl:default <.${accessTo.substring(accessTo.lastIndexOf('/'))}>;
            acl:mode ${mode.map((mode) => "<" + mode + ">").join(", ")} .
    } .` // n3 patch may not contain blank node, so we do the next best thing, and try to generate a unique name
            const aclURI = await getAclResourceUri(accessTo, session);
            await patchResource(aclURI, patchBody, session).catch(
                (err) => {
                    console.info({
                        severity: "error",
                        summary: "Error on patch ACL!",
                        detail: err,
                        life: 5000,
                    });
                    throw new Error(err);
                }
            );
        }

        return {
            grantDataAuthorization,
            accessModes,
            registeredShapeTrees,
            dataInstances,
            containers,
        };
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
        return _fetchN3(uri).then((parsedN3) => parsedN3.store);
    }
    async function _fetchN3(uri: string): Promise<ParsedN3> {
        return getResource(uri, session)
            .catch((err) => {
                console.info({
                    severity: "error", summary: `Error on fetching: ${uri}`, detail: err, life: 5000,
                });
                throw new Error(err);
            })
            .then((resp) => resp.data)
            .then((txt) => parseToN3(txt, uri))
    }

    return {
        reload,
        refreshAccessReceiptInformationResources,
        getAccessRequest,
        getAccessNeedGroup,
        getAccessNeed,

        accessRequestInformationResources,
        accessReceiptInformationResources,
    }
}
