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
import {computed, provide, reactive, ref, watch} from "vue";

// keep track of access requests
const accessRequestInformationResources = ref<string[]>([]);

// keep track of access receipts
const accessReceiptInformationResources = ref<string[]>([]);

// create data authorization container if needed
const dataAuthzContainerName = "data-authorizations"

// create access authorization container if needed
const accessAuthzContainerName = "authorization-registry"

// create access authorization container if needed
const accessAuthzArchiveContainerName = "authorization-archive"

// create access receipt container if needed
const accessReceiptContainerName = "authorization-receipts"
const _accessReceiptLocalName = "accessReceipt";

// Access Requests Maps
const createdAccessReceipts = reactive(new Map<string, string[]>());
// Access Groups Maps
const createdAccessAuthorization = reactive(new Map<string, string[]>());
// Data Authorization Maps
const createdDataAuthorization = reactive(new Map<string, string[]>());

async function _wait(millis = 500) {
    return new Promise(resolve => setTimeout(resolve, millis));
}

/**
 * Composable to work with Access Requests. You can grant and decline incoming access requests.
 *
 * Also note, that for sub-resources like data-authorizations, you can use injections like:
 *
 * ```typescript
 * const getAccessRequest = inject('useAuthorizations:getAccessRequest');
 * const getAccessNeedGroup = inject('useAuthorizations:getAccessNeedGroup');
 * const getAccessNeed = inject('useAuthorizations:getAccessNeed');
 * ```
 * @see getAccessRequest
 * @see getAccessNeedGroup
 * @see getAccessNeed
 *
 * @param inspectedAccessRequestURI
 */
export const useAuthorizations = (inspectedAccessRequestURI = "") => {
    const { session } = useSolidSession();
    const { memberOf } = useSolidProfile()
    const { accessInbox, storage } = useSolidProfile();

    const dataAuthzContainer = computed(() => storage.value + dataAuthzContainerName + "/");
    const accessAuthzContainer = computed(() => storage.value + accessAuthzContainerName + "/");
    const accessAuthzArchiveContainer = computed(() => storage.value + accessAuthzArchiveContainerName + "/");
    const accessReceiptContainer = computed(() => storage.value + accessReceiptContainerName + "/");

    const reload = () => {
        refreshAccessRequestInformationResources()
        refreshAccessReceiptInformationResources();
    };

    // Watch storage and create containers if they don't exist already
    watch(storage, async () => {
        if (!storage.value) {
            return
        }
        getResource(dataAuthzContainer.value, session)
            .catch(() => createContainer(storage.value, dataAuthzContainerName, session))
            .catch((err) => {
                console.error({
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
                console.error({
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
                console.error({
                    severity: "error", summary: "Failed to create Access Receipt Container!", detail: err, life: 5000,
                });
                throw new Error(err);
            })
        getResource(accessReceiptContainer.value, session)
            .catch(() => createContainer(storage.value, accessReceiptContainerName, session))
            .catch((err) => {
                console.error({
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
     * Sub-Composable to retrieve Access Request by an URI
     *
     * You can inject this function after "useAuthorizations" was called like:
     *
     * ```typescript
     * const getAccessRequest = inject('useAuthorizations:getAccessRequest');
     * ```
     *
     * @see getAccessNeedGroup
     *
     * @param uri
     * @param redirect
     */
    async function getAccessRequest(uri: string, redirect?: string) {
        const store: Store = await _fetchStoreOf(uri);
        const grantTrigger = ref(false);

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
         * @param associatedAccessReceipt
         */
        function _updateCreatedAccessReceipts(associatedAccessReceipt: string) {
            const list = _getCreatedAccessReceipts(uri);
            createdAccessReceipts.set(_getRawURI(uri), [...list, associatedAccessReceipt]);
        }

        /**
         * Trigger children access need groups to create access authorization and trigger their children,
         * wait until all children have done so,
         * then create access receipt and emit finish event to parent,
         * if redirect present,
         * redirect
         *
         * @see grantAccessAuthorization
         * @see grantDataAuthorization
         */
        async function grantWithAccessReceipt(overrideAccessAuthorizationsParam?: string[]) {
            grantTrigger.value = true;
            await _wait();

            if (!overrideAccessAuthorizationsParam) {
                // wait until all events fired
                while (_getCreatedAccessAuthorization(uri).length !== accessNeedGroups.length) {
                    console.debug("Waiting for access receipt ...", _getRawURI(uri), _getCreatedAccessAuthorization(uri).length, accessNeedGroups.length);
                    await _wait();
                }
            }

            const accessAuthorizations = overrideAccessAuthorizationsParam ?? _getCreatedAccessAuthorization(uri);

            // create access receipt
            const accessReceiptLocation = await _createAccessReceipt(
                [...accessAuthorizations]
            );

            // emit to overview
            const associatedAccessReceipt = `${accessReceiptLocation}#${_accessReceiptLocalName}`
            _updateCreatedAccessReceipts(associatedAccessReceipt);

            reload();

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
                    console.error({
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
            grantTrigger,

            purposes,
            fromSocialAgents,
            forSocialAgents,
            seeAlso,
            accessNeedGroups,
            senderName,
            granteeName,
        }
    }

    /**
     * Sub-Composable to retrieve Access Need Group (Access Authorization) by an URI
     *
     * You can inject this function after "useAuthorizations" was called like:
     *
     * ```typescript
     * const getAccessNeedGroup = inject('useAuthorizations:getAccessNeedGroup');
     * ```
     *
     * @see getAccessNeed
     *
     * @param uri
     * @param forSocialAgents
     */
    async function getAccessNeedGroup(uri: string, forSocialAgents: string[]) {
        const store = await _fetchStoreOf(uri);
        const grantTrigger = ref(false);

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

        function _updateCreatedAccessAuthorization(associatedAccessAuthorization: string): void {
            const list = _getCreatedAccessAuthorization(uri);
            createdAccessAuthorization.set(_getRawURI(uri), [...list, associatedAccessAuthorization])
        }

        /**
         * Trigger children access needs to create data authorization and set acls,
         * wait until all children have done so,
         * then create access authorization and emit finish event to parent
         *
         * @see grantDataAuthorization
         */
        async function grantAccessAuthorization(): Promise<string> {
            grantTrigger.value = true;

            // wait until all events fired
            while (_getCreatedDataAuthorization(uri).length !== accessNeeds.length) {
                console.debug("Waiting for data authorizations ...", _getRawURI(uri), _getCreatedDataAuthorization(uri).length, accessNeeds.length);
                await _wait();
            }

            // trigger access authorization
            const accessAuthzLocation = await _createAccessAuthorization(
                forSocialAgents,
                [..._getCreatedDataAuthorization(uri)],
            );

            const associatedAccessAuthorization = `${accessAuthzLocation}#${accessAuthzLocalName}`;
            _updateCreatedAccessAuthorization(associatedAccessAuthorization);

            return associatedAccessAuthorization;
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
            if (!forSocialAgents.length) { throw new Error('Unexpected Empty List: forSocialAgents'); }
            if (!dataAuthorizations.length) { throw new Error('Unexpected Empty List: dataAuthorizations'); }

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
                    console.error({
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
            grantTrigger,

            accessNeeds,
            prefLabels,
            definitions,
        }
    }

    /**
     * Sub-Composable to retrieve Access Need (Data Authorization) by an URI
     *
     * You can inject this function after "useAuthorizations" was called like:
     *
     * ```typescript
     * const getAccessNeed = inject('useAuthorizations:getAccessNeed');
     * ```
     *
     * @param uri
     * @param forSocialAgents
     */
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

        containers.value = await _checkIfMatchingDataRegistrationExists();

        async function _checkIfMatchingDataRegistrationExists() {
            const dataRegistrations = await getDataRegistrationContainers(
                `${memberOf.value}`,
                registeredShapeTrees[0],
                session
            ).catch((err) => {
                console.error({
                    severity: "error",
                    summary: "Error on getDataRegistrationContainers!",
                    detail: err,
                    life: 5000,
                });
                throw new Error(err);
            });
            if (dataRegistrations.length <= 0) {
                // TODO emit no dataregistration?
                // emit("noDataRegistrationFound", registeredShapeTrees[0])
            }
            return dataRegistrations;
        }

        /**
         * remember created data authorizations
         * @param associatedDataAuthorization
         */
        function _updateCreatedDataAuthorization(associatedDataAuthorization: string): void {
            const list = _getCreatedDataAuthorization(uri);
            createdDataAuthorization.set(_getRawURI(uri), [...list, associatedDataAuthorization]);
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
                    console.error({
                        severity: "error",
                        summary: "Error on getDataRegistrationContainers!",
                        detail: err,
                        life: 5000,
                    });
                    throw new Error(err);
                });

                const dataInstancesForNeed: string[] = [...dataInstances];
                const dataAuthzLocation = await _createDataAuthorization(forSocialAgents, registeredShapeTrees, accessModes, dataRegistrations, dataInstancesForNeed);
                // if selected data instances given, then only give access to those, else, give to registration
                const accessToResources = dataInstancesForNeed.length > 0 ? dataInstancesForNeed : dataRegistrations;
                // only grant specific resource access
                for (const resource of accessToResources) {
                    await _updateAccessControlList(resource, forSocialAgents, accessModes);
                }

                const associatedDataAuthorization = `${dataAuthzLocation}#${dataAuthzLocalName}`;
                _updateCreatedDataAuthorization(associatedDataAuthorization);

                return associatedDataAuthorization;
            }

            return undefined;
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
        async function _createDataAuthorization(
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
                    console.error({
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
        async function _updateAccessControlList(
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
                    console.error({
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
        const newListOfAccessRequests: string[] = await _getAccessRequestInformationResources(accessInbox.value);
        accessRequestInformationResources.value = [...newListOfAccessRequests]
    }

    async function refreshAccessReceiptInformationResources() {
        const newListOfAccessReceipts: string[] = inspectedAccessRequestURI ? await _getAccessReceiptInformationResourcesForAccessRequest(inspectedAccessRequestURI) : await _getAccessReceiptInformationResources();
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
                console.error({
                    severity: "error", summary: `Error on fetching: ${uri}`, detail: err, life: 5000,
                });
                throw new Error(err);
            })
            .then((resp) => resp.data)
            .then((txt) => parseToN3(txt, uri))
    }

    /**
     * Retrieve access requests from an access inbox
     * @param accessInbox
     */
    async function _getAccessRequestInformationResources(accessInbox: string) {
        if (!accessInbox) {
            return [];
        }
        if (inspectedAccessRequestURI) {
            return [_getRawURI(inspectedAccessRequestURI)]
        }
        return await getContainerItems(accessInbox, session)
    }

    /**
     * get the access receipts
     */
    async function _getAccessReceiptInformationResources() {
        return await getContainerItems(accessReceiptContainer.value, session)
    }

    /**
     * get the access receipt(s) of accessRequestURI
     */
    async function _getAccessReceiptInformationResourcesForAccessRequest(accessRequestURI: string) {
        const accessReceiptStore = new Store();
        const accessReceiptContainerItems = await _getAccessReceiptInformationResources();
        await _fillItemStoresIntoStore(accessReceiptContainerItems, accessReceiptStore)

        return accessReceiptStore.getSubjects(AUTH("hasAccessRequest"), accessRequestURI, null).map(subject => subject.value);
    }

    /**
     * @param uri
     */
    function _getCreatedAccessReceipts(uri: string) {
        return createdAccessReceipts.get(_getRawURI(uri)) ?? [];
    }

    /**
     * @param uri
     */
    function _getCreatedAccessAuthorization(uri: string){
        return createdAccessAuthorization.get(_getRawURI(uri)) ?? [];
    }

    /**
     * @param uri
     */
    function _getCreatedDataAuthorization(uri: string) {
        return createdDataAuthorization.get(_getRawURI(uri)) ?? [];
    }


    function _getRawURI(uri: string): string { return uri.split('#')[0]; }

    // Providers that can be used to retrieve sub-resources from the composable
    // Using provide/inject also prevents duplicate requests and the need to
    // pass the parent URI everytime

    provide('useAuthorizations:getAccessRequest', getAccessRequest);
    provide('useAuthorizations:getAccessNeedGroup', getAccessNeedGroup);
    provide('useAuthorizations:getAccessNeed', getAccessNeed);

    return {
        reload,

        accessRequestInformationResources,
        accessReceiptInformationResources,

        // Deprecated
        accessAuthzContainer,
        accessAuthzArchiveContainer,
    }
}
