"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuthorizations = void 0;
exports.useAccessRequest = useAccessRequest;
exports.useAccessReceipt = useAccessReceipt;
exports.useAccessNeedGroup = useAccessNeedGroup;
exports.useAccessAuthorization = useAccessAuthorization;
exports.useAccessNeed = useAccessNeed;
exports.useDataAuthorization = useDataAuthorization;
const useSolidProfile_1 = require("./useSolidProfile");
const useSolidSession_1 = require("./useSolidSession");
const solid_1 = require("hackathon-demo/libs/solid");
const utils_1 = require("hackathon-demo/libs/utils");
const n3_1 = require("n3");
const vue_1 = require("vue");
const inspectedAccessRequestURI = (0, vue_1.ref)(undefined);
const session = (0, vue_1.ref)();
// keep track of access requests
const accessRequestInformationResources = (0, vue_1.ref)([]);
// keep track of access receipts
const accessReceiptInformationResources = (0, vue_1.ref)([]);
const handledAccessRequests = (0, vue_1.ref)([]);
const accessRequests = (0, vue_1.computed)(() => accessRequestInformationResources.value.filter(r => !handledAccessRequests.value.map(h => h.split('#')[0]).includes(r)));
// keep track of which children access authorizations are already revoked
const emptyAuthorizations = (0, vue_1.ref)([]);
const shapeTreesOfMissingDataRegs = (0, vue_1.ref)([]);
const replacedAccessAuthorizations = (0, vue_1.ref)([]);
/**
 * ensure synchronous operations
 * idea: disable children while running
 */
const revokeReceiptIsWaitingForAccessAuthorizations = (0, vue_1.ref)(false);
const _revokeAccessAuthorizationEvents = (0, vue_1.ref)([]);
// create data authorization container if needed
const dataAuthzContainerName = "data-authorizations";
// create access authorization container if needed
const accessAuthzContainerName = "authorization-registry";
// create access authorization container if needed
const accessAuthzArchiveContainerName = "authorization-archive";
// create access receipt container if needed
const accessReceiptContainerName = "authorization-receipts";
const _accessReceiptLocalName = "accessReceipt";
// Access Requests Maps
const createdAccessReceipts = (0, vue_1.reactive)(new Map());
// Access Groups Maps
const createdAccessAuthorization = (0, vue_1.reactive)(new Map());
// Data Authorization Maps
const createdDataAuthorization = (0, vue_1.reactive)(new Map());
const dataAuthzContainer = (0, vue_1.ref)(''); // computed(() => storage.value + dataAuthzContainerName + "/");
const accessAuthzContainer = (0, vue_1.ref)(''); // computed(() => storage.value + accessAuthzContainerName + "/");
const accessAuthzArchiveContainer = (0, vue_1.ref)(''); // computed(() => storage.value + accessAuthzArchiveContainerName + "/");
const accessReceiptContainer = (0, vue_1.ref)(''); // computed(() => storage.value + accessReceiptContainerName + "/");
const _initialized = (0, vue_1.ref)(false);
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
async function useAccessRequest(uri, redirect) {
    const { reload } = (0, exports.useAuthorizations)();
    const store = await _fetchStoreOf(uri);
    const grantTrigger = (0, vue_1.ref)(false);
    //
    const accessRequest = store.getSubjects((0, solid_1.RDF)("type"), (0, solid_1.INTEROP)("AccessRequest"), null).map(t => t.value)[0];
    const purposes = store.getObjects(accessRequest, (0, solid_1.GDPRP)('purposeForProcessing'), null).map(t => t.value);
    const fromSocialAgents = store.getObjects(accessRequest, (0, solid_1.INTEROP)("fromSocialAgent"), null).map(t => t.value);
    const _forSocialAgentsDirect = store.getObjects(accessRequest, (0, solid_1.INTEROP)("forSocialAgent"), null).map(t => t.value);
    const forSocialAgents = _forSocialAgentsDirect.length ? _forSocialAgentsDirect : fromSocialAgents;
    const seeAlso = store.getObjects(accessRequest, (0, solid_1.RDFS)("seeAlso"), null).map(t => t.value);
    const accessNeedGroups = store.getObjects(accessRequest, (0, solid_1.INTEROP)("hasAccessNeedGroup"), null).map(t => t.value);
    //
    const senderStore = await _fetchStoreOf(fromSocialAgents[0]);
    const granteeStore = await _fetchStoreOf(forSocialAgents[0]);
    //
    const senderName = senderStore.getObjects(null, (0, solid_1.FOAF)("name"), null)[0]?.value;
    const granteeName = granteeStore.getObjects(null, (0, solid_1.FOAF)("name"), null)[0]?.value;
    //
    /**
     * @param associatedAccessReceipt
     */
    function _updateCreatedAccessReceipts(associatedAccessReceipt) {
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
    async function grantWithAccessReceipt(overrideAccessAuthorizationsParam) {
        grantTrigger.value = true;
        if (!overrideAccessAuthorizationsParam) {
            // wait until all events fired
            while (_getCreatedAccessAuthorization(uri).length !== accessNeedGroups.length) {
                console.debug("Waiting for access receipt ...", _getRawURI(uri), _getCreatedAccessAuthorization(uri).length, accessNeedGroups.length);
                await (0, utils_1.wait)();
            }
        }
        const accessAuthorizations = overrideAccessAuthorizationsParam ?? _getCreatedAccessAuthorization(uri);
        // create access receipt
        const accessReceiptLocation = await _createAccessReceipt([...accessAuthorizations]);
        // emit to overview
        const associatedAccessReceipt = `${accessReceiptLocation}#${_accessReceiptLocalName}`;
        _updateCreatedAccessReceipts(associatedAccessReceipt);
        reload();
        // redirect if wanted
        if (redirect) {
            window.open(`${redirect}?uri=${encodeURIComponent(accessRequest)}&result=${accessAuthorizations.length ? 1 : 0}`, "_self");
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
    async function _createAccessReceipt(accessAuthorizations) {
        const date = new Date().toISOString();
        let payload = `
    @prefix interop:<${(0, solid_1.INTEROP)()}> .
    @prefix xsd:<${(0, solid_1.XSD)()}> .
    @prefix auth:<${(0, solid_1.AUTH)()}> .

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
        payload += ' .';
        return (0, solid_1.createResource)(accessReceiptContainer.value, payload, session.value)
            .then((loc) => {
            console.info({
                severity: "success",
                summary: "Access Receipt created.",
                life: 5000,
            });
            return (0, solid_1.getLocationHeader)(loc);
        })
            .catch((err) => {
            console.error({
                severity: "error",
                summary: "Failed to create Access Receipt!",
                detail: err,
                life: 5000,
            });
            throw new Error(err);
        });
    }
    return {
        grantWithAccessReceipt,
        declineWithAccessReceipt,
        grantTrigger,
        shapeTreesOfMissingDataRegs,
        purposes,
        fromSocialAgents,
        forSocialAgents,
        seeAlso,
        accessNeedGroups,
        senderName,
        granteeName,
    };
}
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
async function useAccessReceipt(uri, redirect) {
    const informationResourceStore = await _fetchStoreOf(uri);
    // because we get the information resource URI, we need to find the Access Receipt URI, in theory there could be many,
    // but we only consider the first access receipt in an information resource. Not perfect, but makes it easier right now.
    // const receipt = store.value.getSubjects(RDF("type"), INTEROP("AccessReceipt"), null).map(t => t.value)
    const accessReceipt = informationResourceStore.getSubjects((0, solid_1.RDF)("type"), (0, solid_1.INTEROP)("AccessReceipt"), null).map(t => t.value)[0];
    const provisionDates = informationResourceStore.getObjects(accessReceipt, (0, solid_1.INTEROP)("providedAt"), null).map(t => t.value);
    const accessRequests = informationResourceStore.getObjects(accessReceipt, (0, solid_1.AUTH)("hasAccessRequest"), null).map(t => t.value);
    const accessAuthorizations = informationResourceStore.getObjects(accessReceipt, (0, solid_1.INTEROP)("hasAccessAuthorization"), null).map(t => t.value);
    // get access request data
    const accessRequestStore = await _fetchStoreOf(accessRequests[0]);
    const purpose = accessRequestStore.getObjects(null, (0, solid_1.GDPRP)("purposeForProcessing"), null)[0]?.value;
    // logic
    if (accessRequests.length > 0) {
        _addRequestsToHandled(accessRequests);
    }
    // keep track of which children access authorizations did not yet revoked rights
    // to keep track if this access receipt is revoked yet
    const nonEmptyAuthorizations = accessAuthorizations.filter(auth => !emptyAuthorizations.value.includes(auth));
    const isRevokedOrDenied = !nonEmptyAuthorizations.length;
    const status = isRevokedOrDenied ? accessAuthorizations.length > 0 ? 'Revoked' : 'Denied' : 'Active';
    // Watchers
    (0, vue_1.watch)(_revokeAccessAuthorizationEvents, async () => {
        const event = _revokeAccessAuthorizationEvents.value.pop();
        if (event) {
            const { oldAuthorization, newAuthorization } = event;
            await updateAccessAuthorization(oldAuthorization, newAuthorization);
            if (redirect) {
                window.open(`${redirect}?uri=${encodeURIComponent(uri)}`, "_self");
            }
        }
    });
    // Functions
    /**
     * Trigger children access authorizations to revoke rights,
     * wait until all children have done so,
     * then upate this access receipt
     */
    async function revokeAccessReceiptRights() {
        // trigger access authorizations to revoke rights
        revokeReceiptIsWaitingForAccessAuthorizations.value = true; // use this as trigger
        // wait on all the not yet empty (i.e. revoked) access authorizations
        while (replacedAccessAuthorizations.value.length !== nonEmptyAuthorizations.length) {
            console.log("Waiting for access authorizations to be revoked ...");
            await (0, utils_1.wait)();
        }
        // then removeAccessAuthroizations
        await _updateAccessReceipt(replacedAccessAuthorizations.value);
        revokeReceiptIsWaitingForAccessAuthorizations.value = false;
        if (redirect) {
            window.open(`${redirect}?uri=${encodeURIComponent(uri)}`, "_self");
        }
    }
    /**
     *
     * When a children access authorization is updated, we add it to the replace list
     * and update access receipt accordingly
     * @param newAuthorization
     * @param oldAuthorization
     */
    async function updateAccessAuthorization(newAuthorization, oldAuthorization) {
        replacedAccessAuthorizations.value.push({ newAuthorization, oldAuthorization });
        // if this component is waiting, do nothing, we will handle this in batch
        if (revokeReceiptIsWaitingForAccessAuthorizations.value) {
            return;
        }
        // else, just remove this one data authorization from the event
        await _updateAccessReceipt([{ newAuthorization, oldAuthorization }])
            .then(() => replacedAccessAuthorizations.value.length = 0); // reset replaced, because otherwise old URIs are in cache
        if (redirect) {
            window.open(`${redirect}?uri=${encodeURIComponent(uri)}`, "_self");
        }
    }
    /**
     * Update the access receipt, replace the access authorizations as queued up in the list
     * @param replacedAuthorization
     */
    async function _updateAccessReceipt(replacedAuthorization) {
        for (const pairAuthorization of replacedAuthorization) {
            const patchBody = `
@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix interop: <${(0, solid_1.INTEROP)()}>.

_:rename a solid:InsertDeletePatch;
    solid:where {
        ?receipt interop:hasAccessAuthorization <${pairAuthorization.oldAuthorization}> .
    } ;
    solid:inserts {
        ?receipt interop:hasAccessAuthorization <${pairAuthorization.newAuthorization}> .
    } ;
    solid:deletes {
        ?receipt interop:hasAccessAuthorization <${pairAuthorization.oldAuthorization}> .
    } .`;
            await (0, solid_1.patchResource)(uri, patchBody, session.value)
                .then(() => console.info({
                severity: "success",
                summary: "Access Receipt updated.",
                life: 5000,
            }))
                .catch((err) => {
                console.error({
                    severity: "error",
                    summary: "Error on patch Receipt!",
                    detail: err,
                    life: 5000,
                });
                throw new Error(err);
            });
            informationResourceStore.removeQuad(new n3_1.NamedNode(accessReceipt), new n3_1.NamedNode((0, solid_1.INTEROP)("hasAccessAuthorization")), new n3_1.NamedNode(pairAuthorization.oldAuthorization));
            informationResourceStore.addQuad(new n3_1.NamedNode(accessReceipt), new n3_1.NamedNode((0, solid_1.INTEROP)("hasAccessAuthorization")), new n3_1.NamedNode(pairAuthorization.newAuthorization));
        }
        // TODO: what does this do?
        //  informationResourceStore = new Store(informationResourceStore.getQuads(null, null, null, null))
    }
    return {
        revokeAccessReceiptRights,
        updateAccessAuthorization,
        provisionDates,
        accessRequests,
        accessAuthorizations,
        purpose,
        isRevokedOrDenied,
        status,
        revokeReceiptIsWaitingForAccessAuthorizations,
    };
}
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
async function useAccessNeedGroup(uri, forSocialAgents) {
    const { memberOf } = (0, useSolidProfile_1.useSolidProfile)();
    const store = await _fetchStoreOf(uri);
    const grantTrigger = (0, vue_1.ref)(false);
    const accessNeeds = store.getObjects(uri, (0, solid_1.INTEROP)("hasAccessNeed"), null).map(t => t.value);
    /**
     * ! SPEC - data model problem:
     * The access need group only links to the access description set, but from that set, there is no link to any further description.
     * That is, based on an access request, we can not discover its description.
     *
     * So, we assume that we have all knowledge we need and query the data
     */
    const descriptionResources = store.getObjects(uri, (0, solid_1.INTEROP)('hasAccessDescriptionSet'), null).map(t => t.value);
    for (const descriptionResource of descriptionResources) {
        await _fetchN3(descriptionResource).then((parsedN3) => (store.addQuads(parsedN3.store.getQuads(null, null, null, null))));
    }
    const _sthsThatHasAccessNeedGroup = store.getSubjects((0, solid_1.INTEROP)('hasAccessNeedGroup'), uri, null).map(t => t.value);
    let prefLabels = [];
    let definitions = [];
    /**
     * ! SPEC - data model problem:
     * interop:hasAccessNeedGroup
     *  domain -> interop:AccessRequest OR AccessNeedGroupDescription
     */
    for (const sth of _sthsThatHasAccessNeedGroup) {
        const _prefLabels = store.getObjects(sth, (0, solid_1.SKOS)('prefLabel'), null).map(t => t.value);
        if (_prefLabels.length) {
            prefLabels = _prefLabels;
        }
        const _definitions = store.getObjects(sth, (0, solid_1.SKOS)('definition'), null).map(t => t.value);
        if (_definitions.length) {
            definitions = _definitions;
        }
    }
    //
    // Authorize Access Need Group
    //
    // define a 'local name', i.e. the URI fragment, for the access authorization URI
    const accessAuthzLocalName = "accessAuthorization";
    function _updateCreatedAccessAuthorization(associatedAccessAuthorization) {
        const list = _getCreatedAccessAuthorization(uri);
        createdAccessAuthorization.set(_getRawURI(uri), [...list, associatedAccessAuthorization]);
    }
    /**
     * Trigger children access needs to create data authorization and set acls,
     * wait until all children have done so,
     * then create access authorization and emit finish event to parent
     *
     * @see grantDataAuthorization
     */
    async function grantAccessAuthorization() {
        grantTrigger.value = true;
        // wait until all events fired
        while (_getCreatedDataAuthorization(uri).length !== accessNeeds.length) {
            console.debug("Waiting for data authorizations ...", _getRawURI(uri), _getCreatedDataAuthorization(uri).length, accessNeeds.length);
            await (0, utils_1.wait)();
        }
        // trigger access authorization
        const accessAuthzLocation = await _createAccessAuthorization(forSocialAgents, [..._getCreatedDataAuthorization(uri)]);
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
    async function _createAccessAuthorization(forSocialAgents, dataAuthorizations) {
        if (!forSocialAgents.length) {
            throw new Error('Unexpected Empty List: forSocialAgents');
        }
        if (!dataAuthorizations.length) {
            throw new Error('Unexpected Empty List: dataAuthorizations');
        }
        const date = new Date().toISOString();
        const payload = `
    @prefix interop:<${(0, solid_1.INTEROP)()}> .
    @prefix xsd:<${(0, solid_1.XSD)()}> .

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
        return (0, solid_1.createResource)(accessAuthzContainer.value, payload, session.value)
            .then((loc) => {
            console.info({
                severity: "success",
                summary: "Access Authorization created.",
                life: 5000,
            });
            return (0, solid_1.getLocationHeader)(loc);
        })
            .catch((err) => {
            console.error({
                severity: "error",
                summary: "Failed to create Access Authorization!",
                detail: err,
                life: 5000,
            });
            throw new Error(err);
        });
    }
    return {
        grantAccessAuthorization,
        grantTrigger,
        accessNeeds,
        prefLabels,
        definitions,
    };
}
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
async function useAccessAuthorization(uri, redirect) {
    const resourceStore = await _fetchStoreOf(uri);
    const grantDates = resourceStore.getObjects(uri, (0, solid_1.INTEROP)('grantedAt'), null).map(t => t.value);
    const grantees = resourceStore.getObjects(uri, (0, solid_1.INTEROP)('grantee'), null).map(t => t.value);
    const accessNeedGroups = resourceStore.getObjects(uri, (0, solid_1.INTEROP)('hasAccessNeedGroup'), null).map(t => t.value);
    const dataAuthorizations = resourceStore.getObjects(uri, (0, solid_1.INTEROP)('hasDataAuthorization'), null).map(t => t.value);
    const granteeStore = await _fetchStoreOf(grantees[0]);
    const granteeName = granteeStore.getObjects(null, (0, solid_1.FOAF)("name"), null)[0]?.value;
    if (dataAuthorizations.length == 0) {
        _addToEmpty(uri);
    }
    /**
     * ensure synchronous operations
     * idea: disable children while running
     */
    const isWaitingForDataAuthorizations = (0, vue_1.ref)(false);
    // keep track of which children data authorizations already revoked rights
    const revokedDataAuthorizations = (0, vue_1.ref)([]);
    /**
     * Trigger children data authorizations to revoke rights,
     * wait until all children have done so,
     * then create new access authorization to replace this current one and emit finish event to parent
     */
    async function revokeAccessAuthorizationRights() {
        // trigger data authorizations to revoke acls
        isWaitingForDataAuthorizations.value = true; // use this as trigger
        // wait on all the data authorizations
        while (revokedDataAuthorizations.value.length !== dataAuthorizations.length) {
            console.log("Waiting for data authorizations to be revoked ...");
            await (0, utils_1.wait)();
        }
        // then removeDataAuthroizations
        await _removeDataAuthorizationsAndCreateNewAccessAuthorization(dataAuthorizations);
        isWaitingForDataAuthorizations.value = false;
    }
    /**
     * When a children data authorization is revoked, we add it to the revoked list
     * and create a new and updated access authorization to replace this current one.
     * @param dataAuthorization to remove from the current access authorization
     */
    async function removeDataAuthorization(dataAuthorization) {
        revokedDataAuthorizations.value.push(dataAuthorization);
        // if this component is waiting, do nothing, we will handle this in batch
        if (isWaitingForDataAuthorizations.value) {
            return;
        }
        // else, just remove this one data authorization from the event
        return _removeDataAuthorizationsAndCreateNewAccessAuthorization([dataAuthorization]);
    }
    /**
     * create a new and updated access authorization to replace this current one,
     * given the data authorizations to remove from the current access authorization
     *
     * emit to the parent component, i.e. an Access Receipt, that there is a new access authorization to link to
     *
     * ? this could be refractored, indeed, to make it nicer but it works.
     *
     * @param dataAuthorizations to remove from the current access authorization
     */
    async function _removeDataAuthorizationsAndCreateNewAccessAuthorization(dataAuthorizations) {
        // copy authorization to archive
        const archivedLocation = await (0, solid_1.createResource)(accessAuthzArchiveContainer.value, "", session.value)
            .then((loc) => {
            console.info({
                severity: "info",
                summary: "Archived Access Authorization created.",
                life: 5000,
            });
            return (0, solid_1.getLocationHeader)(loc);
        })
            .catch((err) => {
            console.error({
                severity: "error",
                summary: "Failed to create Archived Access Receipt!",
                detail: err,
                life: 5000,
            });
            throw new Error(err);
        });
        const n3Writer = new n3_1.Writer();
        const archiveStore = new n3_1.Store();
        const oldQuads = resourceStore.getQuads(uri, null, null, null);
        const accessAuthzLocale = uri.split("#")[1];
        for (const quad of oldQuads) {
            archiveStore.addQuad(new n3_1.NamedNode(archivedLocation + "#" + accessAuthzLocale), quad.predicate, quad.object, quad.graph);
        }
        let copyBody = n3Writer.quadsToString(archiveStore.getQuads(null, null, null, null));
        await (0, solid_1.putResource)(archivedLocation, copyBody, session.value)
            .then(() => console.info({
            severity: "success",
            summary: "Archived Access Authorization updated.",
            life: 5000,
        }))
            .catch((err) => {
            console.error({
                severity: "error",
                summary: "Failed to updated Archived Access Receipt!",
                detail: err,
                life: 5000,
            });
            throw new Error(err);
        });
        // create updated authorization
        const newLocation = await (0, solid_1.createResource)(accessAuthzContainer.value, "", session.value)
            .then((loc) => {
            console.info({
                severity: "info",
                summary: "New Access Authorization created.",
                life: 5000,
            });
            return (0, solid_1.getLocationHeader)(loc);
        })
            .catch((err) => {
            console.error({
                severity: "error",
                summary: "Failed to create new Access Receipt!",
                detail: err,
                life: 5000,
            });
            throw new Error(err);
        });
        // in new resource, update uris
        for (const quad of oldQuads) {
            resourceStore.addQuad(new n3_1.NamedNode(newLocation + "#" + accessAuthzLocale), quad.predicate, quad.object, quad.graph);
            resourceStore.removeQuad(quad);
        }
        // in new resource, add replaces
        resourceStore.addQuad(new n3_1.NamedNode(newLocation + "#" + accessAuthzLocale), new n3_1.NamedNode((0, solid_1.INTEROP)("replaces")), new n3_1.NamedNode(archivedLocation + "#" + accessAuthzLocale));
        // in new resource, update grantedAt
        const grantedAtQuads = resourceStore.getQuads(new n3_1.NamedNode(newLocation + "#" + accessAuthzLocale), (0, solid_1.INTEROP)("grantedAt"), null, null);
        resourceStore.removeQuads(grantedAtQuads);
        const dateLiteral = n3_1.DataFactory.literal(new Date().toISOString(), new n3_1.NamedNode((0, solid_1.XSD)("dateTime")));
        resourceStore.addQuad(new n3_1.NamedNode(newLocation + "#" + accessAuthzLocale), new n3_1.NamedNode((0, solid_1.INTEROP)("grantedAt")), dateLiteral);
        // in new resource, remove link to data authorization
        for (const dataAuthorization of dataAuthorizations) {
            resourceStore.removeQuads(resourceStore.getQuads(new n3_1.NamedNode(newLocation + "#" + accessAuthzLocale), new n3_1.NamedNode((0, solid_1.INTEROP)("hasDataAuthorization")), dataAuthorization, null));
            // Notice: this is also the place, where you could update a data authorization, e.g. for freeze
        }
        // write to new authorization
        copyBody = n3Writer.quadsToString(resourceStore.getQuads(null, null, null, null));
        await (0, solid_1.putResource)(newLocation, copyBody, session.value)
            .then(() => console.info({
            severity: "success",
            summary: "New Access Authorization updated.",
            life: 5000,
        }))
            .catch((err) => {
            console.error({
                severity: "error",
                summary: "Failed to updated new Access Receipt!",
                detail: err,
                life: 5000,
            });
            throw new Error(err);
        });
        // delete old one
        await (0, solid_1.deleteResource)(uri, session.value);
        // emit update
        _updateAccessAuthorization(`${newLocation}#${accessAuthzLocale}`, uri);
    }
    async function _updateAccessAuthorization(newAuthorization, oldAuthorization) {
        replacedAccessAuthorizations.value.push({ newAuthorization, oldAuthorization });
        // if this component is waiting, do nothing, we will handle this in batch
        if (revokeReceiptIsWaitingForAccessAuthorizations.value) {
            return;
        }
        // else, just remove this one data authorization from the event
        _revokeAccessAuthorizationEvents.value.push({ newAuthorization, oldAuthorization });
    }
    return {
        revokeAccessAuthorizationRights,
        removeDataAuthorization,
        grantDates,
        grantees,
        accessNeedGroups,
        dataAuthorizations,
        granteeName,
        isWaitingForDataAuthorizations,
        revokedDataAuthorizations,
    };
}
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
async function useAccessNeed(uri, forSocialAgents) {
    const { memberOf } = (0, useSolidProfile_1.useSolidProfile)();
    const store = await _fetchStoreOf(uri);
    // define a 'local name', i.e. the URI fragment, for the data authorization URI
    const dataAuthzLocalName = "dataAuthorization";
    const accessModes = store.getObjects(uri, (0, solid_1.INTEROP)("accessMode"), null).map(t => t.value);
    const registeredShapeTrees = store.getObjects(uri, (0, solid_1.INTEROP)("registeredShapeTree"), null).map(t => t.value);
    const dataInstances = store.getObjects(uri, (0, solid_1.INTEROP)("hasDataInstance"), null).map(t => t.value);
    const containers = (0, vue_1.ref)([]);
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
        const dataRegistrations = await (0, solid_1.getDataRegistrationContainers)(`${memberOf.value}`, registeredShapeTrees[0], session.value).catch((err) => {
            console.error({
                severity: "error",
                summary: "Error on getDataRegistrationContainers!",
                detail: err,
                life: 5000,
            });
            throw new Error(err);
        });
        if (dataRegistrations.length <= 0) {
            _noDataRegistrationFound(registeredShapeTrees[0]);
        }
        return dataRegistrations;
    }
    /**
     * remember created data authorizations
     * @param associatedDataAuthorization
     */
    function _updateCreatedDataAuthorization(associatedDataAuthorization) {
        const list = _getCreatedDataAuthorization(uri);
        createdDataAuthorization.set(_getRawURI(uri), [...list, associatedDataAuthorization]);
    }
    /**
     * Set the .acl for any resource required in this access need.
     */
    async function grantDataAuthorization() {
        // find registries
        for (const shapeTree of registeredShapeTrees) {
            const dataRegistrations = await (0, solid_1.getDataRegistrationContainers)(`${memberOf.value}`, shapeTree, session.value).catch((err) => {
                console.error({
                    severity: "error",
                    summary: "Error on getDataRegistrationContainers!",
                    detail: err,
                    life: 5000,
                });
                throw new Error(err);
            });
            const dataInstancesForNeed = [...dataInstances];
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
    async function _createDataAuthorization(forSocialAgents, registeredShapeTrees, accessModes, registrations, instances) {
        const payload = `
    @prefix interop:<${(0, solid_1.INTEROP)()}> .
    @prefix ldp:<${(0, solid_1.LDP)()}> .
    @prefix xsd:<${(0, solid_1.XSD)()}> .
    @prefix acl:<${(0, solid_1.ACL)()}> .
    @prefix auth:<${(0, solid_1.AUTH)()}> .

    <#${dataAuthzLocalName}>
      a interop:DataAuthorization ;
      interop:grantee ${forSocialAgents
            .map((t) => "<" + t + ">")
            .join(", ")} ;
      interop:registeredShapeTree ${registeredShapeTrees
            .map((t) => "<" + t + ">")
            .join(", ")} ;
      interop:accessMode ${accessModes
            .map((t) => "<" + t + ">")
            .join(", ")} ;
      interop:scopeOfAuthorization  ${instances && instances.length > 0
            ? "interop:SelectedFromRegistry"
            : "interop:AllFromRegistry"} ;
      interop:hasDataRegistration ${registrations
            .map((t) => "<" + t + ">")
            .join(", ")} ;
      ${instances && instances.length > 0
            ? "interop:hasDataInstance " +
                instances.map((t) => "<" + t + ">").join(", ") +
                " ;"
            : ""}
      interop:satisfiesAccessNeed <${uri}> .`;
        return (0, solid_1.createResource)(dataAuthzContainer.value, payload, session.value)
            .then((loc) => {
            console.info({
                severity: "success",
                summary: "Data Authorization created.",
                life: 5000,
            });
            return (0, solid_1.getLocationHeader)(loc);
        })
            .catch((err) => {
            console.error({
                severity: "error",
                summary: "Failed to create Data Authorization!",
                detail: err,
                life: 5000,
            });
            throw new Error(err);
        });
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
    async function _updateAccessControlList(accessTo, agent, mode) {
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
    } .`; // n3 patch may not contain blank node, so we do the next best thing, and try to generate a unique name
        const aclURI = await (0, solid_1.getAclResourceUri)(accessTo, session.value);
        await (0, solid_1.patchResource)(aclURI, patchBody, session.value).catch((err) => {
            console.error({
                severity: "error",
                summary: "Error on patch ACL!",
                detail: err,
                life: 5000,
            });
            throw new Error(err);
        });
    }
    return {
        grantDataAuthorization,
        accessModes,
        registeredShapeTrees,
        dataInstances,
        containers,
    };
}
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
async function useDataAuthorization(uri) {
    const { memberOf } = (0, useSolidProfile_1.useSolidProfile)();
    const resourceStore = await _fetchStoreOf(uri);
    const accessModes = resourceStore.getObjects(uri, (0, solid_1.INTEROP)("accessMode"), null).map(t => t.value);
    const registeredShapeTrees = resourceStore.getObjects(uri, (0, solid_1.INTEROP)("registeredShapeTree"), null).map(t => t.value);
    const dataInstances = resourceStore.getObjects(uri, (0, solid_1.INTEROP)("hasDataInstance"), null).map(t => t.value);
    const dataRegistrations = resourceStore.getObjects(uri, (0, solid_1.INTEROP)("hasDataRegistration"), null).map(t => t.value);
    const grantees = resourceStore.getObjects(uri, (0, solid_1.INTEROP)('grantee'), null).map(t => t.value);
    const scopes = resourceStore.getObjects(uri, (0, solid_1.INTEROP)('scopeOfAuthorization'), null).map(t => t.value);
    const accessNeeds = resourceStore.getObjects(uri, (0, solid_1.INTEROP)('satisfiesAccessNeed'), null).map(t => t.value);
    const granteeStore = await _fetchStoreOf(grantees[0]);
    const granteeName = granteeStore.getObjects(null, (0, solid_1.FOAF)("name"), null)[0]?.value;
    /**
     * Set the .acl for any resource required in this data authorization.
     */
    async function revokeDataAuthorizationRights() {
        for (const shapeTree of registeredShapeTrees) {
            const dataRegistrations = await (0, solid_1.getDataRegistrationContainers)(`${memberOf.value}`, shapeTree, session.value).catch((err) => {
                console.error({
                    severity: "error",
                    summary: "Error on getDataRegistrationContainers!",
                    detail: err,
                    life: 5000,
                });
                throw new Error(err);
            });
            const dataInstancesForNeed = [];
            dataInstancesForNeed.push(...dataInstances); // potentially manually edited (added/removed) in auth agent
            const accessToResources = dataInstancesForNeed.length > 0 ? dataInstancesForNeed : dataRegistrations;
            // only grant specific resource access
            for (const resource of accessToResources) {
                await _updateAccessControlListToDelete(resource, grantees, accessModes);
            }
            // TODO emit("revokedDataAuthorization", uri)
        }
    }
    /**
     * Remove the rights specified in this data authorization from the ACL
     * Make sure that the owner has still control as well.
     *
     * ? This could potentially be extracted to a library.
     *
     * @param accessTo
     * @param agents
     * @param modes
     */
    async function _updateAccessControlListToDelete(accessTo, agents, modes) {
        const aclURI = await (0, solid_1.getAclResourceUri)(accessTo, session.value);
        /**
         * see problems below
         */
        //     const patchBody = `
        // @prefix solid: <http://www.w3.org/ns/solid/terms#>.
        // @prefix acl: <http://www.w3.org/ns/auth/acl#>.
        // _:rename a solid:InsertDeletePatch;
        //     solid:where {
        //         ?auth a acl:Authorization ;
        //             acl:accessTo <${accessTo}>;
        //             acl:agent ${agents.map((a) => "<" + a + ">").join(", ")};
        //             acl:default <${accessTo}> ;
        //             acl:mode ${modes.map((mode) => "<" + mode + ">").join(", ")} .
        //     } ;
        //     solid:deletes {
        //         ?auth acl:agent ${agents.map((a) => "<" + a + ">").join(", ")} .
        //     } .` // n3 patch may not contain blank node, so we do the next best thing, and try to generate a unique name
        // await patchResource(aclURI, patchBody, session.value).catch(
        //     (err) => {
        //         console.info({
        //             severity: "error",
        //             summary: "Error on patch ACL!",
        //             detail: err,
        //             life: 5000,
        //         });
        //         throw new Error(err);
        //     }
        // );
        /**
         * We have two problems:
         * * cannot have mutliple matches for where clause on server side (results in status 409)
         * * no matches for where clause on server side (results in status 409)
         *
         */
        //  therefore...
        const aclStore = await _fetchStoreOf(aclURI);
        for (const agent of agents) {
            for (const mode of modes) {
                const agentAuthzQuads = aclStore.getQuads(null, (0, solid_1.ACL)("agent"), agent, null)
                    .filter(quad => (aclStore.getQuads(quad.subject, (0, solid_1.ACL)("mode"), mode, null).length == 1))
                    .filter(quad => (aclStore.getQuads(quad.subject, (0, solid_1.ACL)("accessTo"), accessTo, null).length == 1))
                    .filter(quad => (aclStore.getQuads(quad.subject, (0, solid_1.ACL)("default"), accessTo, null).length == 1));
                aclStore.removeQuads(agentAuthzQuads);
            }
        }
        // START cleanup of authorizations where no agent is attached
        aclStore.getSubjects((0, solid_1.RDF)("type"), (0, solid_1.ACL)("Authorization"), null)
            .filter(subj => (aclStore.getQuads(subj, (0, solid_1.ACL)("agent"), null, null).length == 0))
            .filter(subj => (aclStore.getQuads(subj, (0, solid_1.ACL)("agentGroup"), null, null).length == 0))
            .filter(subj => (aclStore.getQuads(subj, (0, solid_1.ACL)("agentClass"), null, null).length == 0))
            .forEach(subj => aclStore.removeQuads(aclStore.getQuads(subj, null, null, null)));
        // END cleanup
        const n3Writer = new n3_1.Writer();
        const aclBody = n3Writer.quadsToString(aclStore.getQuads(null, null, null, null));
        await (0, solid_1.putResource)(aclURI, aclBody, session.value)
            .then(() => console.info({
            severity: "success",
            summary: "ACL updated.",
            life: 5000,
        }))
            .catch((err) => {
            console.info({
                severity: "error",
                summary: "Failed to updated ACL!",
                detail: err,
                life: 5000,
            });
            throw new Error(err);
        });
    }
    return {
        revokeDataAuthorizationRights,
        accessModes,
        registeredShapeTrees,
        dataInstances,
        dataRegistrations,
        grantees,
        scopes,
        accessNeeds,
        granteeName,
    };
}
/*
 * Util Functions
 * @private
 */
async function _refreshAccessRequestInformationResources(accessInbox) {
    const newListOfAccessRequests = await _useAccessRequestInformationResources(accessInbox);
    accessRequestInformationResources.value = [...newListOfAccessRequests];
}
async function _refreshAccessReceiptInformationResources() {
    const newListOfAccessReceipts = inspectedAccessRequestURI.value ? await _useAccessReceiptInformationResourcesForAccessRequest(inspectedAccessRequestURI.value) : await _useAccessReceiptInformationResources();
    accessReceiptInformationResources.value = [...newListOfAccessReceipts];
}
/**
 * when an access receipt states that it is associated to specific access requests
 * @param requests
 */
function _addRequestsToHandled(requests) {
    handledAccessRequests.value = [...handledAccessRequests.value, ...requests];
}
async function _fillItemStoresIntoStore(itemUris, store) {
    const itemStores = await Promise.all(itemUris.map((item) => _fetchStoreOf(item)));
    itemStores
        .map(itemStore => itemStore.getQuads(null, null, null, null))
        .map((quads) => store.addQuads(quads));
}
async function _fetchStoreOf(uri) {
    return _fetchN3(uri).then((parsedN3) => parsedN3.store);
}
async function _fetchN3(uri) {
    return (0, solid_1.getResource)(uri, session.value)
        .catch((err) => {
        console.error({
            severity: "error", summary: `Error on fetching: ${uri}`, detail: err, life: 5000,
        });
        throw new Error(err);
    })
        .then((resp) => resp.data)
        .then((txt) => (0, solid_1.parseToN3)(txt, uri));
}
/**
 * Retrieve access requests from an access inbox
 * @param accessInbox
 */
async function _useAccessRequestInformationResources(accessInbox) {
    if (!accessInbox) {
        return [];
    }
    if (inspectedAccessRequestURI.value) {
        return [_getRawURI(inspectedAccessRequestURI.value)];
    }
    return await (0, solid_1.getContainerItems)(accessInbox, session.value);
}
/**
 * get the access receipts
 */
async function _useAccessReceiptInformationResources() {
    return await (0, solid_1.getContainerItems)(accessReceiptContainer.value, session.value);
}
/**
 * get the access receipt(s) of accessRequestURI
 */
async function _useAccessReceiptInformationResourcesForAccessRequest(accessRequestURI) {
    const accessReceiptStore = new n3_1.Store();
    const accessReceiptContainerItems = await _useAccessReceiptInformationResources();
    await _fillItemStoresIntoStore(accessReceiptContainerItems, accessReceiptStore);
    return accessReceiptStore.getSubjects((0, solid_1.AUTH)("hasAccessRequest"), accessRequestURI, null).map(subject => subject.value);
}
// when a child access authorization emits event that it is empty, i.e. revoked
function _addToEmpty(emptyAuth) {
    emptyAuthorizations.value.push(emptyAuth);
}
// when a child access authorization emits event that it is empty, i.e. revoked
function _noDataRegistrationFound(emptyAuth) {
    shapeTreesOfMissingDataRegs.value.push(emptyAuth);
}
/**
 * @param uri
 */
function _getCreatedAccessReceipts(uri) {
    return createdAccessReceipts.get(_getRawURI(uri)) ?? [];
}
/**
 * @param uri
 */
function _getCreatedAccessAuthorization(uri) {
    return createdAccessAuthorization.get(_getRawURI(uri)) ?? [];
}
/**
 * @param uri
 */
function _getCreatedDataAuthorization(uri) {
    return createdDataAuthorization.get(_getRawURI(uri)) ?? [];
}
function _getRawURI(uri) { return uri.split('#')[0]; }
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
const useAuthorizations = (uri = "") => {
    const { session: _session } = (0, useSolidSession_1.useSolidSession)();
    const { accessInbox, storage } = (0, useSolidProfile_1.useSolidProfile)();
    inspectedAccessRequestURI.value = uri;
    session.value = _session;
    const reload = () => {
        _refreshAccessRequestInformationResources(accessInbox.value);
        _refreshAccessReceiptInformationResources();
    };
    function initialize() {
        if (_initialized.value) {
            return;
        }
        _initialized.value = true;
        // Watch storage and create containers if they don't exist already
        (0, vue_1.watch)(storage, async () => {
            if (!storage.value) {
                return;
            }
            dataAuthzContainer.value = storage.value + dataAuthzContainerName + "/";
            accessAuthzContainer.value = storage.value + accessAuthzContainerName + "/";
            accessAuthzArchiveContainer.value = storage.value + accessAuthzArchiveContainerName + "/";
            accessReceiptContainer.value = storage.value + accessReceiptContainerName + "/";
            (0, solid_1.getResource)(dataAuthzContainer.value, session.value)
                .catch(() => (0, solid_1.createContainer)(storage.value, dataAuthzContainerName, session.value))
                .catch((err) => {
                console.error({
                    severity: "error",
                    summary: "Failed to create Data Authorization Container!",
                    detail: err,
                    life: 5000,
                });
                throw new Error(err);
            });
            (0, solid_1.getResource)(accessAuthzContainer.value, session.value)
                .catch(() => (0, solid_1.createContainer)(storage.value, accessAuthzContainerName, session.value))
                .catch((err) => {
                console.error({
                    severity: "error",
                    summary: "Failed to create Access Authorization Container!",
                    detail: err,
                    life: 5000,
                });
                throw new Error(err);
            });
            (0, solid_1.getResource)(accessAuthzArchiveContainer.value, session.value)
                .catch(() => (0, solid_1.createContainer)(storage.value, accessAuthzArchiveContainerName, session.value))
                .catch((err) => {
                console.error({
                    severity: "error", summary: "Failed to create Access Receipt Container!", detail: err, life: 5000,
                });
                throw new Error(err);
            });
            (0, solid_1.getResource)(accessReceiptContainer.value, session.value)
                .catch(() => (0, solid_1.createContainer)(storage.value, accessReceiptContainerName, session.value))
                .catch((err) => {
                console.error({
                    severity: "error", summary: "Failed to create Access Receipt Container!", detail: err, life: 5000,
                });
                throw new Error(err);
            });
        }, { immediate: true });
        // once an access inbox is available, get the access requests from there
        // except when we have a specific access request to focus on. then only focus on that one.
        (0, vue_1.watch)(accessInbox, () => {
            reload();
        }, { immediate: true });
    }
    return {
        initialize,
        reload,
        accessRequests,
        accessReceiptInformationResources,
    };
};
exports.useAuthorizations = useAuthorizations;
