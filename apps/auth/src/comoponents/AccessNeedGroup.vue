<template>
    <div class="accessNeedGroup">
        <div>
            <strong>Label: </strong>
            <div v-for="label in prefLabels" :key="label">
                {{ label }}
            </div>
        </div>
        <div>
            <strong>Definition: </strong>
            <div v-for="definition in definitions" :key="definition">
                {{ definition }}
            </div>
        </div>
        <div class="p-card" style="margin: 5px">
            <div>
                <strong>Access Needs</strong>
            </div>
            <Button @click="grantAccessAuthorization" type="button" class="btn btn-primary mb-2"
                :disabled="associatedAccessAuthorization !== '' || requestAuthorizationTrigger">
                Authorize Group
            </Button>
            <div v-for="accessNeed in accessNeeds" :key="accessNeed" class="p-card col-12 lg:col-8 lg:col-offset-2"
                style="margin: 5px">
                <Suspense>
                    <AccessNeed :resourceURI="accessNeed" :forSocialAgents="forSocialAgents"
                        :dataAuthzContainer="dataAuthzContainer" @createdDataAuthorization="addToDataAuthorizations"
                        :groupAuthorizationTrigger="dataAuthorizationTrigger" />
                    <template #fallback>
                        <span>
                            Loading {{ accessNeed.split("/")[accessNeed.split("/").length - 1] }}
                        </span>
                    </template>
                </Suspense>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import AccessNeed from "../comoponents/AccessNeed.vue";
import { useSolidSession } from "@shared/composables";
import {
    getResource,
    parseToN3,
    INTEROP,
    SKOS,
    createResource,
    getLocationHeader,
    XSD,
} from "@shared/solid";
import { Store } from "n3";
import { useToast } from "primevue/usetoast";
import { computed, reactive, ref, watch } from "vue";

const props = defineProps(["resourceURI", "redirect", "forSocialAgents", "accessAuthzContainer", "dataAuthzContainer", "requestAuthorizationTrigger"]);
const emit = defineEmits(["createdAccessAuthorization"])
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

const accessNeeds = computed(() =>
    store.value.getObjects(props.resourceURI, INTEROP("hasAccessNeed"), null).map(t => t.value)
)

/**
 * ! SPEC - data model problem:
 * The access need group only links to the access description set, but from that set, there is no link to any further description.
 * That is, based on an access request, we can not discover its description.
 * 
 * So, we assume that we have all knowledge we need and query the data
 */

const descriptionResources = store.value.getObjects(props.resourceURI, INTEROP('hasAccessDescriptionSet'), null).map(t => t.value)

for (const descriptionResource of descriptionResources) {
    await getResource(descriptionResource, authFetch.value)
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
        .then((parsedN3) => (store.value.addQuads(parsedN3.store.getQuads(null, null, null, null))));
}
const prefLabels = computed(() => {
    /**
 * ! SPEC - data model problem:
 * interop:hasAccessNeedGroup 
 *  domain -> interop:AccessRequest OR AccessNeedGroupDescription
 */
    const sthsThatHasAccessNeedGroup = store.value.getSubjects(INTEROP('hasAccessNeedGroup'), props.resourceURI, null).map(t => t.value)
    for (const sth of sthsThatHasAccessNeedGroup) {
        const prefLabels = store.value.getObjects(sth, SKOS('prefLabel'), null).map(t => t.value)
        if (prefLabels.length > 0) {
            return prefLabels
        }
    }
    return []
})

const definitions = computed(() => {
    /**
     * ! SPEC - data model problem:
     * interop:hasAccessNeedGroup 
     *  domain -> interop:AccessRequest OR AccessNeedGroupDescription
     */
    const sthsThatHasAccessNeedGroup = store.value.getSubjects(INTEROP('hasAccessNeedGroup'), props.resourceURI, null).map(t => t.value)
    for (const sth of sthsThatHasAccessNeedGroup) {
        const definitions = store.value.getObjects(sth, SKOS('definition'), null).map(t => t.value)
        if (definitions.length > 0) {
            return definitions
        }
    }
    return []
})

// 
// 
// 

const accessAuthzLocalName = "accessAuthorization"

const associatedAccessAuthorization = ref("")
watch(() => props.requestAuthorizationTrigger, () => {
    if (associatedAccessAuthorization.value) { return }
    grantAccessAuthorization()
})

const dataAuthorizations = reactive(new Map());
const dataAuthorizationTrigger = ref(false)
function addToDataAuthorizations(accessNeed: string, dataAuthorization: string) {
    dataAuthorizations.set(accessNeed, dataAuthorization)
}

async function grantAccessAuthorization() {
    // trigger data grants
    dataAuthorizationTrigger.value = true
    // wait until all events fired
    while (dataAuthorizations.size !== accessNeeds.value.length) {
        console.log("Waiting for data authorizations ...");
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    // trigger access authorization
    const accessAuthzLocation = createAccessAuthorization(
        props.forSocialAgents,
        [...dataAuthorizations.values()]
    )
    associatedAccessAuthorization.value = (await accessAuthzLocation) + "#" + accessAuthzLocalName
    emit("createdAccessAuthorization", props.resourceURI, associatedAccessAuthorization.value)
}

async function createAccessAuthorization(
    forSocialAgents: string[],
    dataAuthorizations: string[]
) {
    const date = new Date().toISOString();
    const payload = `
    @prefix interop:<${INTEROP()}> .
    @prefix xsd:<${XSD()}> .

    <#${accessAuthzLocalName}>
      a interop:AccessAuthorization ;
      interop:grantedBy <${sessionInfo.webId}> ;
      interop:grantedAt "${date}"^^xsd:dateTime ;
      interop:grantee ${forSocialAgents
            .map((t) => "<" + t + ">")
            .join(", ")} ;
      interop:hasAccessNeedGroup <${props.resourceURI}> ;
      interop:hasDataAuthorization ${dataAuthorizations
            .map((t) => "<" + t + ">")
            .join(", ")} . 
`;
    return createResource(props.accessAuthzContainer, payload, authFetch.value)
        .then((loc) => {
            toast.add({
                severity: "success",
                summary: "Access Authorization created.",
                life: 5000,
            })
            return getLocationHeader(loc)
        }
        )
        .catch((err) => {
            toast.add({
                severity: "error",
                summary: "Failed to create Access Authorization!",
                detail: err,
                life: 5000,
            });
            throw new Error(err);
        })
}
</script>