<template>
    <div class="p-card accessAuthorization">
        <a :href="resourceURI">
          {{ resourceURI.split("/").pop() }}
        </a>
        <div class="field">
            <div class="fieldLabel">Grant date: </div>
            <div v-for="date in grantDates" :key="date">
                {{ date }}
            </div>
        </div>
        <div class="field">
            <div class="fieldLabel">Grantees: </div>
            <a v-for="grantee in grantees" :key="grantee" :href="grantee">
                {{ granteeName }}
            </a>
        </div>
        <div class="field">
            <div class="fieldLabel">Access Need Groups: </div>
            <a v-for="accessNeedGroup in accessNeedGroups" :key="accessNeedGroup" :href="accessNeedGroup">
                {{ accessNeedGroup.split("/").pop() }}
            </a>
        </div>
        <div v-if="dataAuthorizations.length > 0">
            <div class="dataAuthorizations">
                <div class="fieldLabel">Data Authorizations</div>
            </div>
            <div>
                <!-- TODO Freeze -->
                <!-- <Button @click="freezeAuthorizations()" type="button" style="margin: 20px"
                class="btn btn-primary p-button-warning">
                Freeze
            </Button> -->
                <Button @click="revokeRights" type="button" style="margin: 1rem 0" class="btn btn-primary p-button-danger"
                    :disabled="isWaitingForDataAuthorizations">
                    Revoke all authorizations in this group
                </Button>
            </div>
            <div v-for="dataAuthorization in dataAuthorizations" :key="dataAuthorization">
                <Suspense>
                    <DataAuthorization :resourceURI="dataAuthorization"
                        :groupRevokationTrigger="isWaitingForDataAuthorizations"
                        @revokedDataAuthorization="removeDataAuthorization" />
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

<style scoped>
.accessAuthorization {
  margin: 0 0 1rem 1rem;
  padding: 1rem;
  border-radius: 7px;
  background-color: var(--surface-b);
}

.field {
  display: flex;
  margin-bottom: 0;
}

.fieldLabel {
  min-width: 18rem;
  font-weight: bold;
  margin-right: 1rem;
}

a {
  color: rgba(0, 108, 110, 1);
  text-decoration: underline;
  font-weight: bold;
}

.dataAuthorizations {
  margin-top: 1rem;

  .fieldLabel {
    font-size: 1.1rem;
  }
}
</style>

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
  XSD, FOAF,
} from "@shared/solid";
import { DataFactory, NamedNode, Store, Writer } from "n3";
import { useToast } from "primevue/usetoast";
import {computed, reactive, ref, watch} from "vue";

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
const { session } = useSolidSession();
const toast = useToast();

const state = reactive({
  resourceStore: new Store(),
  granteeStore: new Store()
});

// get data
state.resourceStore = await getResource(props.resourceURI, session)
    .catch((err) => {
        toast.add({
            severity: "error",
            summary: "Could not get access request!",
            detail: err,
            life: 5000,
        });
        throw new Error(err);
    })
    .then((resp) => resp.data)
    .then((txt) => parseToN3(txt, props.resourceURI))
    .then((parsedN3) => (state.resourceStore = parsedN3.store));


// compute properties
const grantDates = computed(() => state.resourceStore.getObjects(props.resourceURI, INTEROP('grantedAt'), null).map(t => t.value))
const grantees = computed(() => state.resourceStore.getObjects(props.resourceURI, INTEROP('grantee'), null).map(t => t.value))
const accessNeedGroups = computed(() => state.resourceStore.getObjects(props.resourceURI, INTEROP('hasAccessNeedGroup'), null).map(t => t.value))
const dataAuthorizations = computed(() => state.resourceStore.getObjects(props.resourceURI, INTEROP('hasDataAuthorization'), null).map(t => t.value))

//get grantee data
state.granteeStore = await getResource(grantees.value[0], session)
  .catch((err) => {
    toast.add({
      severity: "error",
      summary: "Could not get grantee!",
      detail: err,
      life: 5000,
    });
    throw new Error(err);
  })
  .then((resp) => resp.data)
  .then((txt) => parseToN3(txt, props.resourceURI))
  .then((parsedN3) => (state.granteeStore = parsedN3.store));

const granteeName = computed(() => state.granteeStore.getObjects(null, FOAF("name"), null)[0]?.value);

//
// revoke access authorization
//

// check if this component is being triggered to revoke from its parent
watch(() => props.receipRevokationTrigger, () => {
    if (props.receipRevokationTrigger) {
        revokeRights()
    }
})

// check if this component is an revoked authorization,
// i.e. it is an access authoirzation that does not link to any data authorization
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
// keep track of which children data authorizations already revoked rights
const revokedDataAuthorizations = ref([] as string[])
/**
 * Trigger children data authorizations to revoke rights,
 * wait until all children have done so,
 * then create new access authorization to replace this current one and emit finish event to parent
 */
async function revokeRights() {
    // trigger data authorizations to revoke acls
    isWaitingForDataAuthorizations.value = true // use this as trigger
    // wait on all the data authorizations
    while (revokedDataAuthorizations.value.length !== dataAuthorizations.value.length) {
        console.log("Waiting for data authorizations to be revoked ...");
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    // then removeDataAuthroizations
    await removeDataAuthorizationsAndCreateNewAccessAuthorization(dataAuthorizations.value)
    isWaitingForDataAuthorizations.value = false
}

/**
 * When a children data authorization is revoked, we add it to the revoked list
 * and create a new and updated access authorization to replace this current one.
 * @param dataAuthorization to remove from the current access authorization
 */
async function removeDataAuthorization(dataAuthorization: string) {
    revokedDataAuthorizations.value.push(dataAuthorization)
    // if this component is waiting, do nothing, we will handle this in batch
    if (isWaitingForDataAuthorizations.value) { return }
    // else, just remove this one data authorization from the event
    return removeDataAuthorizationsAndCreateNewAccessAuthorization([dataAuthorization])
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
async function removeDataAuthorizationsAndCreateNewAccessAuthorization(dataAuthorizations: string[]) {
    // copy authorization to archive
    const archivedLocation = await createResource(props.accessAuthzArchiveContainer, "", session)
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
    const oldQuads = state.resourceStore.getQuads(props.resourceURI, null, null, null)
    const accessAuthzLocale = props.resourceURI.split("#")[1]
    for (const quad of oldQuads) {
        archiveStore.addQuad(new NamedNode(archivedLocation + "#" + accessAuthzLocale), quad.predicate, quad.object, quad.graph)
    }
    let copyBody = n3Writer.quadsToString(archiveStore.getQuads(null, null, null, null))
    await putResource(archivedLocation, copyBody, session)
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
    const newLocation = await createResource(props.accessAuthzContainer, "", session)
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
        state.resourceStore.addQuad(new NamedNode(newLocation + "#" + accessAuthzLocale), quad.predicate, quad.object, quad.graph)
        state.resourceStore.removeQuad(quad)
    }
    // in new resource, add replaces
    state.resourceStore.addQuad(
        new NamedNode(newLocation + "#" + accessAuthzLocale),
        new NamedNode(INTEROP("replaces")),
        new NamedNode(archivedLocation + "#" + accessAuthzLocale))
    // in new resource, update grantedAt

    const grantedAtQuads = state.resourceStore.getQuads(new NamedNode(newLocation + "#" + accessAuthzLocale), INTEROP("grantedAt"), null, null)
    state.resourceStore.removeQuads(grantedAtQuads)
    const dateLiteral = DataFactory.literal(new Date().toISOString(), new NamedNode(XSD("dateTime")));
    state.resourceStore.addQuad(
        new NamedNode(newLocation + "#" + accessAuthzLocale),
        new NamedNode(INTEROP("grantedAt")),
        dateLiteral
    )
    // in new resource, remove link to data authorization
    for (const dataAuthorization of dataAuthorizations) {
        state.resourceStore.removeQuads(state.resourceStore.getQuads(
            new NamedNode(newLocation + "#" + accessAuthzLocale),
            new NamedNode(INTEROP("hasDataAuthorization")),
            dataAuthorization, null))
        // Notice: this is also the place, where you could update a data authorization, e.g. for freeze
    }
    // write to new authorization
    copyBody = n3Writer.quadsToString(state.resourceStore.getQuads(null, null, null, null))
    await putResource(newLocation, copyBody, session)
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
    await deleteResource(props.resourceURI, session)
    // emit update
    emit("updatedAccessAuthorization", newLocation + "#" + accessAuthzLocale, props.resourceURI)

}
</script>
