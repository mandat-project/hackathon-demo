<template>
    <div class="accessAuthorization">
        <div>
            <strong>Grant date: </strong>
            <div v-for="date in grantDates" :key="date">
                {{ date }}
            </div>
        </div>
        <div>
            <strong>Grantees: </strong>
            <a v-for="grantee in grantees" :key="grantee" :href="grantee">
                {{ grantee }}
            </a>
        </div>
        <div>
            <strong>Access Need Groups: </strong>
            <a v-for="accessNeedGroup in accessNeedGroups" :key="accessNeedGroup" :href="accessNeedGroup">
                {{ accessNeedGroup }}
            </a>
        </div>
        <div class="p-card" style="margin: 5px" v-if="dataAuthorizations.length > 0">
            <div>
                <strong>Data Authorizations</strong>
            </div>
            <div>
                <!-- TODO Freeze -->
                <!-- <Button @click="freezeRights()" type="button" style="margin: 20px"
                class="btn btn-primary p-button-warning">
                Freeze
            </Button> -->
                <Button @click="revokeRights" type="button" style="margin: 20px" class="btn btn-primary p-button-danger"
                    :disabled="isWaitingForDataAuthorizations">
                    Revoke Group
                </Button>
            </div>
            <div v-for="dataAuthorization in dataAuthorizations" :key="dataAuthorization"
                class="p-card col-12 lg:col-8 lg:col-offset-2" style="margin: 5px">
                <Suspense>
                    <DataAuthorization :resourceURI="dataAuthorization"
                        :groupRevokationTrigger="isWaitingForDataAuthorizations" :dataAuthzContainer="dataAuthzContainer"
                        @revokedDataAuthorization="removeDataAuthorization" 
                        @replacedDataAuthorization="replaceDataAuthorization"/>
                    <template #fallback>
                        <span>
                            Loading {{ dataAuthorization.split("/")[dataAuthorization.split("/").length - 1] }}
                        </span>
                    </template>
                </Suspense>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import DataAuthorization from "../comoponents/DataAuthorization.vue";
import { useSolidSession } from "@shared/composables";
import {
    getResource,
    parseToN3,
    INTEROP,
    createResource,
    getLocationHeader,
    putResource,
    deleteResource,
    XSD,
} from "@shared/solid";
import { DataFactory, Literal, NamedNode, Store, Writer } from "n3";
import { useToast } from "primevue/usetoast";
import { computed, ref, watch } from "vue";

const props = defineProps([
    "resourceURI",
    "redirect",
    "forSocialAgents",
    "accessAuthzContainer",
    "dataAuthzContainer",
    "receipRevokationTrigger",
    "accessAuthzArchiveContainer"
]);
const emit = defineEmits(["updatedAccessAuthorization", "isEmptyAuthorization"])
const { authFetch } = useSolidSession();
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

const grantDates = computed(() => store.value.getObjects(props.resourceURI, INTEROP('grantedAt'), null).map(t => t.value))
const grantees = computed(() => store.value.getObjects(props.resourceURI, INTEROP('grantee'), null).map(t => t.value))
const accessNeedGroups = computed(() => store.value.getObjects(props.resourceURI, INTEROP('hasAccessNeedGroup'), null).map(t => t.value))
const dataAuthorizations = computed(() => store.value.getObjects(props.resourceURI, INTEROP('hasDataAuthorization'), null).map(t => t.value))

// 
// 
// 

watch(() => props.receipRevokationTrigger, () => {
    if (props.receipRevokationTrigger) {
        revokeRights()
    }
})

watch(() => dataAuthorizations.value,
    () => {
        if (dataAuthorizations.value.length == 0) {
            emit("isEmptyAuthorization", props.resourceURI)
        }
    }, { immediate: true })

/**
 * ensure synchronous operations
 * idea: disable children while running
 */
const isWaitingForDataAuthorizations = ref(false)
const revokedDataAuthorizations = ref([] as string[])
async function revokeRights() {
    // trigger data authorizations to revoke acls
    isWaitingForDataAuthorizations.value = true // use this as trigger
    // wait on all the data authorizations
    while (revokedDataAuthorizations.value.length !== dataAuthorizations.value.length) {
        console.log("Waiting for data authorizations to be revoked ...");
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    // then removeDataAuthroizations
    await removeDataAuthorizations(dataAuthorizations.value)
    isWaitingForDataAuthorizations.value = false
}


async function removeDataAuthorization(dataAuthorization: string) {
    revokedDataAuthorizations.value.push(dataAuthorization)
    // if this component is waiting, do nothing, we will handle this in batch 
    if (isWaitingForDataAuthorizations.value) { return }
    // else, just remove this one data authorization from the event
    return removeDataAuthorizations([dataAuthorization])
}

async function removeDataAuthorizations(dataAuthorizations: string[]) {
    // copy authorization to archive
    const archivedLocation = await createResource(props.accessAuthzArchiveContainer, "", authFetch.value)
        .then((loc) => {
            toast.add({
                severity: "info",
                summary: "Archived Access Authorization created.",
                life: 5000,
            })
            return getLocationHeader(loc)
        }
        )
        .catch((err) => {
            toast.add({
                severity: "error",
                summary: "Failed to create Archived Access Receipt!",
                detail: err,
                life: 5000,
            });
            throw new Error(err);
        })
    const n3Writer = new Writer();
    const archiveStore = new Store();
    const oldQuads = store.value.getQuads(props.resourceURI, null, null, null)
    const accessAuthzLocale = props.resourceURI.split("#")[1]
    for (const quad of oldQuads) {
        archiveStore.addQuad(new NamedNode(archivedLocation + "#" + accessAuthzLocale), quad.predicate, quad.object, quad.graph)
    }
    let copyBody = n3Writer.quadsToString(archiveStore.getQuads(null, null, null, null))
    await putResource(archivedLocation, copyBody, authFetch.value)
        .then(() =>
            toast.add({
                severity: "success",
                summary: "Archived Access Authorization updated.",
                life: 5000,
            })
        )
        .catch((err) => {
            toast.add({
                severity: "error",
                summary: "Failed to updated Archived Access Receipt!",
                detail: err,
                life: 5000,
            });
            throw new Error(err);
        })
    // create updated authorization
    const newLocation = await createResource(props.accessAuthzContainer, "", authFetch.value)
        .then((loc) => {
            toast.add({
                severity: "info",
                summary: "New Access Authorization created.",
                life: 5000,
            })
            return getLocationHeader(loc)
        }
        )
        .catch((err) => {
            toast.add({
                severity: "error",
                summary: "Failed to create new Access Receipt!",
                detail: err,
                life: 5000,
            });
            throw new Error(err);
        })

    // in new resource, update uris
    for (const quad of oldQuads) {
        store.value.addQuad(new NamedNode(newLocation + "#" + accessAuthzLocale), quad.predicate, quad.object, quad.graph)
        store.value.removeQuad(quad)
    }
    // in new resource, add replaces
    store.value.addQuad(
        new NamedNode(newLocation + "#" + accessAuthzLocale),
        new NamedNode(INTEROP("replaces")),
        new NamedNode(archivedLocation + "#" + accessAuthzLocale))
    // in new resource, update grantedAt
    const grantedAtQuads = store.value.getQuads(new NamedNode(newLocation + "#" + accessAuthzLocale), INTEROP("grantedAt"), null, null)
    store.value.removeQuads(grantedAtQuads)
    const dateLiteral = DataFactory.literal(new Date().toISOString(), new NamedNode(XSD("dateTime")));
    store.value.addQuad(
        new NamedNode(newLocation + "#" + accessAuthzLocale),
        new NamedNode(INTEROP("grantedAt")),
        dateLiteral
    )




    // this is the stuff happening on DATA AUTHZ revoke

    // in new resource, remove link to data authorization
    for (const dataAuthorization of dataAuthorizations) {
        store.value.removeQuads(store.value.getQuads(
            new NamedNode(newLocation + "#" + accessAuthzLocale),
            new NamedNode(INTEROP("hasDataAuthorization")),
            dataAuthorization, null))
    }





    // write to new authorization
    copyBody = n3Writer.quadsToString(store.value.getQuads(null, null, null, null))
    await putResource(newLocation, copyBody, authFetch.value)
        .then(() =>
            toast.add({
                severity: "success",
                summary: "New Access Authorization updated.",
                life: 5000,
            })
        )
        .catch((err) => {
            toast.add({
                severity: "error",
                summary: "Failed to updated new Access Receipt!",
                detail: err,
                life: 5000,
            });
            throw new Error(err);
        })
    // delete old one
    await deleteResource(props.resourceURI, authFetch.value)
    // emit update
    emit("updatedAccessAuthorization", newLocation + "#" + accessAuthzLocale, props.resourceURI)

}
</script>