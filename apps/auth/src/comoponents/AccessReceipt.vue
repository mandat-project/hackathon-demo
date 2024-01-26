<template>
    <div class="accessReceipt">
        <Card>
            <template #content>
                <!-- <div class="accessRequest" v-for="request in requests" :key="request"> -->
                <div>
                    <strong>Provided At: </strong>
                    <span v-for="date in provisionDates" :key="date">
                        {{ date }}
                    </span>
                </div>
                <div>
                    <strong>For Access Request: </strong>
                    <a v-for="accessRequest in accessRequests" :key="accessRequest" :href="accessRequest">
                        {{ accessRequest }}
                    </a>
                </div>
                <div class="p-card" style="margin: 5px">
                    <div>
                        <strong>Access Authoriztions</strong>
                    </div>
                    <div v-if="nonEmptyAuthorizations.length > 0" style="margin: 20px">
                        <!-- TODO Freeze -->
                        <!-- <Button @click="freezeAuthorizations()" type="button" style="margin: 20px"
                class="btn btn-primary p-button-warning">
                Freeze
            </Button> -->
                        <Button @click="revokeRights" type="button" class="btn btn-primary p-button-danger"
                            :disabled="isWaitingForAccessAuthorizations">
                            Revoke Authorizations
                        </Button>
                    </div>
                    <div v-else>
                        <Button disabled class="p-button-rounded p-button-danger m-2">
                            {{ accessAuthorizations.length > 0 ? 'Revoked' : 'Denied' }}
                        </Button>
                    </div>
                    <div v-for="accessAuthorization in accessAuthorizations" :key="accessAuthorization"
                        class="p-card  col-12 lg:col-8 lg:col-offset-2" style="margin: 5px">
                        <Suspense>
                            <AccessAuthorization :resourceURI="accessAuthorization"
                                :accessAuthzContainer="accessAuthzContainer"
                                :accessAuthzArchiveContainer="accessAuthzArchiveContainer"
                                :dataAuthzContainer="dataAuthzContainer"
                                :receipRevokationTrigger="isWaitingForAccessAuthorizations"
                                @updatedAccessAuthorization="updateAccessAuthorization"
                                @isEmptyAuthorization="addToEmpty" />
                            <template #fallback>
                                <span>
                                    Loading {{ accessAuthorization.split("/")[accessAuthorization.split("/").length - 1] }}
                                </span>
                            </template>
                        </Suspense>
                    </div>
                </div>
            </template>
        </Card>
    </div>
</template>
  
<script setup lang="ts">
import AccessAuthorization from "../comoponents/AccessAuthorization.vue";
import { useSolidSession } from "@shared/composables";
import {
    getResource,
    parseToN3,
    RDF,
    INTEROP,
    AUTH,
    patchResource,
} from "@shared/solid";
import { NamedNode, Store } from "n3";
import { useToast } from "primevue/usetoast";
import { computed, ref, watch } from "vue";

const props = defineProps(["informationResourceURI", "accessAuthzContainer", "accessAuthzArchiveContainer", "dataAuthzContainer"]);
const emit = defineEmits(["isReceiptForRequests"])
const { authFetch } = useSolidSession();
const toast = useToast();

const store = ref(new Store());
store.value = await getResource(props.informationResourceURI, authFetch.value)
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
    .then((txt) => parseToN3(txt, props.informationResourceURI))
    .then((parsedN3) => (store.value = parsedN3.store));

// const receipt = store.value.getSubjects(RDF("type"), INTEROP("AccessReceipt"), null).map(t => t.value)
const accessReceipt = store.value.getSubjects(RDF("type"), INTEROP("AccessReceipt"), null).map(t => t.value)[0]

const provisionDates = computed(() => store.value.getObjects(accessReceipt, INTEROP("providedAt"), null).map(t => t.value))
const accessRequests = computed(() => store.value.getObjects(accessReceipt, AUTH("hasAccessRequest"), null).map(t => t.value))
const accessAuthorizations = computed(() => store.value.getObjects(accessReceipt, INTEROP("hasAccessAuthorization"), null).map(t => t.value))

watch(() => accessRequests.value,
    () => {
        if (accessRequests.value.length > 0) {
            emit("isReceiptForRequests", accessRequests.value)
        }
    }, { immediate: true })

// 
// 
// 

/**
 * ensure synchronous operations
 * idea: disable children while running
 */

const emptyAuthorizations = ref([] as string[])
function addToEmpty(emptyAuth: string) {
    emptyAuthorizations.value.push(emptyAuth)
}
const nonEmptyAuthorizations = computed(() => accessAuthorizations.value.filter(auth => !emptyAuthorizations.value.includes(auth)))

type replacedAuthorizationWrapper = { newAuthorization: string, oldAuthorization: string }
const isWaitingForAccessAuthorizations = ref(false)
const replacedAccessAuthorizations = ref([] as replacedAuthorizationWrapper[])
async function revokeRights() {
    // trigger data authorizations to revoke acls
    isWaitingForAccessAuthorizations.value = true // use this as trigger
    // wait on all the data authorizations
    while (replacedAccessAuthorizations.value.length !== nonEmptyAuthorizations.value.length) {
        console.log("Waiting for access authorizations to be revoked ...");
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    // then removeDataAuthroizations
    await updateAccessAuthorizations(replacedAccessAuthorizations.value)
    isWaitingForAccessAuthorizations.value = false
}


async function updateAccessAuthorization(newAuthorization: string, oldAuthorization: string) {
    replacedAccessAuthorizations.value.push({ newAuthorization, oldAuthorization })
    // if this component is waiting, do nothing, we will handle this in batch 
    if (isWaitingForAccessAuthorizations.value) { return }
    // else, just remove this one data authorization from the event
    return updateAccessAuthorizations([{ newAuthorization, oldAuthorization }])
        .then(() => replacedAccessAuthorizations.value.length = 0) // reset replaced, because otherwise old URIs are in cache
}

async function updateAccessAuthorizations(replacedAuthorization: replacedAuthorizationWrapper[]) {
    for (const pairAuthorization of replacedAuthorization) {
        const patchBody = `
@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix interop: <${INTEROP()}>.

_:rename a solid:InsertDeletePatch;
    solid:where {
        ?receipt interop:hasAccessAuthorization <${pairAuthorization.oldAuthorization}> .
    } ;
    solid:inserts {
        ?receipt interop:hasAccessAuthorization <${pairAuthorization.newAuthorization}> .
    } ;
    solid:deletes {
        ?receipt interop:hasAccessAuthorization <${pairAuthorization.oldAuthorization}> .
    } .`
        await patchResource(props.informationResourceURI, patchBody, authFetch.value)
            .then(() =>
                toast.add({
                    severity: "success",
                    summary: "Access Receipt updated.",
                    life: 5000,
                })
            )
            .catch(
                (err) => {
                    toast.add({
                        severity: "error",
                        summary: "Error on patch Receipt!",
                        detail: err,
                        life: 5000,
                    });
                    throw new Error(err);
                }
            );
        store.value.removeQuad(new NamedNode(accessReceipt), new NamedNode(INTEROP("hasAccessAuthorization")), new NamedNode(pairAuthorization.oldAuthorization))
        store.value.addQuad(new NamedNode(accessReceipt), new NamedNode(INTEROP("hasAccessAuthorization")), new NamedNode(pairAuthorization.newAuthorization))
    }
    store.value = new Store(store.value.getQuads(null, null, null, null))
}
</script>