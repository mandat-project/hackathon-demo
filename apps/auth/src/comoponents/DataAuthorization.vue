<template>
    <div class="dataAuthorization">
        <div>
            <strong>Access Needs: </strong>
            <a v-for="accessNeed in accessNeeds" :key="accessNeed" :href="accessNeed">
                {{ accessNeed }}
            </a>
        </div>
        <div>
            <strong>Grantees: </strong>
            <a v-for="grantee in grantees" :key="grantee" :href="grantee">
                {{ grantee }}
            </a>
        </div>
        <div>
            <strong>Authorized Data: </strong>
            <a v-for="shapeTree in registeredShapeTrees" :key="shapeTree" :href="shapeTree">
                {{ shapeTree }}
            </a>
        </div>
        <div>
            <strong>Scope: </strong>
            <a v-for="scope in scopes" :key="scope" :href="scope">
                {{ scope.split("#")[1] }}
            </a>
        </div>
        <div>
            <strong>Data Registrations: </strong>
            <a v-for="dataRegistration in dataRegistrations" :key="dataRegistration" :href="dataRegistration">
                {{ dataRegistration }}
            </a>
        </div>
        <div v-if="dataInstances.length > 0">
            <strong>Authorized Instances: </strong>
            <a v-for="dataInstance in dataInstances" :key="dataInstance" :href="dataInstance">
                {{ dataInstance }}
            </a>
        </div>
        <div>
            <strong>Access Mode: </strong>
            <a v-for="accessMode in accessModes" :key="accessMode" :href="accessMode">
                {{ accessMode.split("#")[1] }}
            </a>
        </div>
        <div>
            <Button @click="freezeRights" type="button" class="btn btn-primary m-2 p-button-warning" :disabled="isFrozen">
                {{ isFrozen ? 'Frozen' : 'Freeze' }}
            </Button>
            <Button @click="revokeRights" type="button" class="btn btn-primary m-2 p-button-danger"
                :disabled="groupRevokationTrigger">
                Revoke
            </Button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useSolidSession } from "@shared/composables";
import {
    getResource,
    parseToN3,
    INTEROP,
    getAclResourceUri,
    getDataRegistrationContainers,
    ACL,
    RDF,
    putResource,
    getContainerItems,
    patchResource,
    AUTH,
    LDP,
    XSD,
    createResource,
    getLocationHeader,
} from "@shared/solid";
import { Store, Writer } from "n3";
import { useToast } from "primevue/usetoast";
import { computed, ref, watch } from "vue";

const props = defineProps(["resourceURI", "groupRevokationTrigger", "dataAuthzContainer"]);
const emit = defineEmits(["revokedDataAuthorization", "replacedDataAuthorization"])
const { authFetch, sessionInfo } = useSolidSession();
const toast = useToast();

const store = ref(new Store());
store.value = await getResource(props.resourceURI, authFetch.value)
    .catch((err) => {
        toast.add({
            severity: "error",
            summary: "Could not get access request!",
            detail: err,
            life: 5000,
        });
        throw new Error(err);
    })
    .then((resp) => resp.text())
    .then((txt) => parseToN3(txt, props.resourceURI))
    .then((parsedN3) => (store.value = parsedN3.store));


const accessModes = computed(() =>
    store.value.getObjects(props.resourceURI, INTEROP("accessMode"), null).map(t => t.value)
)
const registeredShapeTrees = computed(() =>
    store.value.getObjects(props.resourceURI, INTEROP("registeredShapeTree"), null).map(t => t.value)
)
const dataInstances = computed(() =>
    store.value.getObjects(props.resourceURI, INTEROP("hasDataInstance"), null).map(t => t.value)
)
const dataRegistrations = computed(() =>
    store.value.getObjects(props.resourceURI, INTEROP("hasDataRegistration"), null).map(t => t.value)
)
const grantees = computed(() =>
    store.value.getObjects(props.resourceURI, INTEROP('grantee'), null).map(t => t.value)
)
const scopes = computed(() =>
    store.value.getObjects(props.resourceURI, INTEROP('scopeOfAuthorization'), null).map(t => t.value)
)
const accessNeeds = computed(() =>
    store.value.getObjects(props.resourceURI, INTEROP('satisfiesAccessNeed'), null).map(t => t.value)
)


//
// 
// 

watch(() => props.groupRevokationTrigger, () => {
    if (props.groupRevokationTrigger) {
        revokeRights()
    }
})


async function revokeRights() {
    for (const shapeTree of registeredShapeTrees.value) {
        const dataRegistrations = await getDataRegistrationContainers(
            `${sessionInfo.webId}`,
            shapeTree,
            authFetch.value
        ).catch((err) => {
            toast.add({
                severity: "error",
                summary: "Error on getDataRegistrationContainers!",
                detail: err,
                life: 5000,
            });
            throw new Error(err);
        });
        const dataInstancesForNeed = [] as string[];
        dataInstancesForNeed.push(...dataInstances.value); // potentially manually edited (added/removed) in auth agent

        const accessToResources = dataInstancesForNeed.length > 0 ? dataInstancesForNeed : dataRegistrations;
        // only grant specific resource access
        for (const resource of accessToResources) {
            await updateAccessControlListToDelete(resource, grantees.value, accessModes.value)
        }
        emit("revokedDataAuthorization", props.resourceURI)
    }
}

async function updateAccessControlListToDelete(
    accessTo: string,
    agents: string[],
    modes: string[]
) {

    const aclURI = await getAclResourceUri(accessTo, authFetch.value);

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


    // await patchResource(aclURI, patchBody, authFetch.value).catch(
    //     (err) => {
    //         toast.add({
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
     * * cannot have mutliple matches for where clause on server side
     * * no matches for where clause on server side
     * 
     */

    //  therefore...

    const aclStore = await getResource(aclURI, authFetch.value)
        .catch((err) => {
            toast.add({
                severity: "error",
                summary: "Could not load ACL!",
                detail: err,
                life: 5000,
            });
            throw new Error(err);
        })
        .then((resp) => resp.text())
        .then((txt) => parseToN3(txt, aclURI))
        .then((parsedN3) => parsedN3.store);


    for (const agent of agents) {
        for (const mode of modes) {
            const agentAuthzQuads = aclStore.getQuads(null, ACL("agent"), agent, null)
                .filter(quad => (aclStore.getQuads(quad.subject, ACL("mode"), mode, null).length == 1))
                .filter(quad => (aclStore.getQuads(quad.subject, ACL("accessTo"), accessTo, null).length == 1))
                .filter(quad => (aclStore.getQuads(quad.subject, ACL("default"), accessTo, null).length == 1))
            aclStore.removeQuads(agentAuthzQuads)
        }
    }

    // START cleanup of authorizations where no agent is attached 
    aclStore.getSubjects(RDF("type"), ACL("Authorization"), null)
        .filter(subj => (aclStore.getQuads(subj, ACL("agent"), null, null).length == 0))
        .filter(subj => (aclStore.getQuads(subj, ACL("agentGroup"), null, null).length == 0))
        .filter(subj => (aclStore.getQuads(subj, ACL("agentClass"), null, null).length == 0))
        .forEach(subj => aclStore.removeQuads(aclStore.getQuads(subj, null, null, null)))

    // START cleanup

    const n3Writer = new Writer();
    let aclBody = n3Writer.quadsToString(aclStore.getQuads(null, null, null, null))
    await putResource(aclURI, aclBody, authFetch.value)
        .then(() =>
            toast.add({
                severity: "success",
                summary: "ACL updated.",
                life: 5000,
            })
        )
        .catch((err) => {
            toast.add({
                severity: "error",
                summary: "Failed to updated ACL!",
                detail: err,
                life: 5000,
            });
            throw new Error(err);
        })
}


const isFrozen = computed(() => (
    dataInstances.value.length > 0 &&
    (accessModes.value.length == 0
        ||
        (accessModes.value.length == 1 && accessModes.value[0] === ACL('Read')))))

async function freezeRights() {
    for (const shapeTree of registeredShapeTrees.value) {
        const dataRegistrations = await getDataRegistrationContainers(
            `${sessionInfo.webId}`,
            shapeTree,
            authFetch.value
        ).catch((err) => {
            toast.add({
                severity: "error",
                summary: "Error on getDataRegistrationContainers!",
                detail: err,
                life: 5000,
            });
            throw new Error(err);
        });
        const dataInstancesForNeed = [] as string[];
        dataInstancesForNeed.push(...dataInstances.value); // potentially manually edited (added/removed) in auth agent

        for (const dataInstance of dataInstancesForNeed) {
            await updateAccessControlListToDelete(dataInstance, grantees.value, accessModes.value.filter(mode => mode !== ACL("Read")))
        }
        if (accessModes.value.includes(ACL("Read"))) {
            const registrationsDataInstances = [] as string[]
            for (const dataRegistration of dataRegistrations) {
                registrationsDataInstances.push(...(await getContainerItems(dataRegistration, authFetch.value)))
            }
            // only grant specific resource access
            for (const resource of registrationsDataInstances) {
                await updateAccessControlListToSet(resource, grantees.value, [ACL("Read")])
            }
            dataInstancesForNeed.push(...registrationsDataInstances)
        }
        // remove rights from containers
        for (const registration of dataRegistrations) {
            await updateAccessControlListToDelete(registration, grantees.value, accessModes.value)
        }

        // create new DataAuthorization and bubble up link
        const dataAuthzLocation = createDataAuthorization(grantees.value, registeredShapeTrees.value, [ACL("Read")], dataRegistrations, dataInstancesForNeed);
        const newDataAuthorization = (await dataAuthzLocation) + "#" + dataAuthzLocalName
        emit("replacedDataAuthorization", newDataAuthorization, props.resourceURI)
    }
}


/**
 * 
 * The following is replicated code from AccessNeed - extract to lib.
 * 
 */


/**
 * 
 * @param accessTo 
 * @param agent 
 * @param mode 
 */

async function updateAccessControlListToSet(
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
            acl:agent <${sessionInfo.webId}>;
            acl:default <.${accessTo.substring(accessTo.lastIndexOf('/'))}>;
            acl:mode acl:Read, acl:Write, acl:Control.

        <#grantee-${new Date().toISOString()}>
            a acl:Authorization;
            acl:accessTo <.${accessTo.substring(accessTo.lastIndexOf('/'))}>;
            acl:agent ${agent.map((a) => "<" + a + ">").join(", ")};
            acl:default <.${accessTo.substring(accessTo.lastIndexOf('/'))}>;
            acl:mode ${mode.map((mode) => "<" + mode + ">").join(", ")} .
    } .` // n3 patch may not contain blank node, so we do the next best thing, and try to generate a unique name
    const aclURI = await getAclResourceUri(accessTo, authFetch.value);
    await patchResource(aclURI, patchBody, authFetch.value).catch(
        (err) => {
            toast.add({
                severity: "error",
                summary: "Error on patch ACL!",
                detail: err,
                life: 5000,
            });
            throw new Error(err);
        }
    );
}

const dataAuthzLocalName = "dataAuthorization"
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
      interop:satisfiesAccessNeed <${props.resourceURI}> .`;

    return createResource(props.dataAuthzContainer, payload, authFetch.value)
        .then((loc) => {
            toast.add({
                severity: "success",
                summary: "Data Authorization created.",
                life: 5000,
            })
            return getLocationHeader(loc)
        }
        )
        .catch((err) => {
            toast.add({
                severity: "error",
                summary: "Failed to create Data Authorization!",
                detail: err,
                life: 5000,
            });
            throw new Error(err);
        })
}
</script>