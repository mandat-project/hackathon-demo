<template>
  <div class="accessReceipt">
    <Card>
      <template #content>
        <div class="contentContainer">
          <!-- <div class="accessRequest" v-for="request in requests" :key="request"> -->
          <div class="field">
            <div class="fieldLabel">Provided At: </div>
            <span v-for="date in provisionDates" :key="date">
                          {{ date }}
                      </span>
          </div>
          <div class="field">
            <div class="fieldLabel">For Access Request: </div>
            <a v-for="accessRequest in accessRequests" :key="accessRequest" :href="accessRequest">
              {{ accessRequest.split("/").pop() }}
            </a>
          </div>
          <div class="field">
            <div class="fieldLabel">Purpose: </div>
            <a :href="purpose">
              {{ purpose.split("#").pop() }}
            </a>
          </div>
          <div class="accessAuthorizations">
            <div>
              <div class="fieldLabel">Access Authorizations</div>
            </div>
            <div v-if="nonEmptyAuthorizations.length > 0" style="margin: 1rem 0">
              <!-- TODO Freeze -->
              <!-- <Button @click="freezeAuthorizations()" type="button" style="margin: 20px"
      class="btn btn-primary p-button-warning">
      Freeze
  </Button> -->
              <Button @click="revokeRights" type="button" class="btn btn-primary p-button-danger"
                      :disabled="isWaitingForAccessAuthorizations">
                Revoke all shown Authorizations
              </Button>
            </div>
            <div v-else>
              <Button disabled class="p-button-rounded p-button-danger" style="margin-bottom: 1rem;">
                {{ accessAuthorizations.length > 0 ? 'Revoked' : 'Denied' }}
              </Button>
            </div>
            <div v-for="accessAuthorization in accessAuthorizations" :key="accessAuthorization">
              <Suspense>
                <AccessAuthorization :resourceURI="accessAuthorization"
                                    :accessAuthzContainer="accessAuthzContainer"
                                    :accessAuthzArchiveContainer="accessAuthzArchiveContainer"
                                    :receipRevokationTrigger="isWaitingForAccessAuthorizations"
                                    @updatedAccessAuthorization="updateAccessAuthorization"
                                    @isEmptyAuthorization="addToEmpty"/>
                <template #fallback>
                                  <span>
                                      Loading {{
                                      accessAuthorization.split("/")[accessAuthorization.split("/").length - 1]
                                    }}
                                  </span>
                </template>
              </Suspense>
            </div>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.accessReceipt {
  margin-bottom: 1.5rem;
}

.contentContainer {
  margin: -0.5rem 0;
  padding: 0 0.5rem;
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

.accessAuthorizations {
  margin-top: 1rem;

  .fieldLabel {
    font-size: 1.1rem;
    margin-bottom: 1rem;
  }
}
</style>

<script setup lang="ts">
import AccessAuthorization from "../comoponents/AccessAuthorization.vue";
import {useSolidSession} from "@shared/composables";
import {
  getResource,
  parseToN3,
  RDF,
  INTEROP,
  AUTH,
  patchResource, GDPRP,
} from "@shared/solid";
import {NamedNode, Store} from "n3";
import {useToast} from "primevue/usetoast";
import {computed, reactive, ref, watch} from "vue";

const props = defineProps(["informationResourceURI", "accessAuthzContainer", "redirect", "accessAuthzArchiveContainer"]);
const emit = defineEmits(["isReceiptForRequests"])
const {session} = useSolidSession();
const toast = useToast();

const state = reactive({
  informationResourceStore: new Store(),
  accessRequestStore: new Store()
});

// get data
state.informationResourceStore = await getResource(props.informationResourceURI, session)
  .catch((err) => {
    toast.add({
      severity: "error",
      summary: "Could not get access receipt!",
      detail: err,
      life: 5000,
    });
    throw new Error(err);
  })
  .then((resp) => resp.data)
  .then((txt) => parseToN3(txt, props.informationResourceURI))
  .then((parsedN3) => (state.informationResourceStore = parsedN3.store));

// compute properties to display


// // because we get the information resource URI, we need to find the Access Receipt URI, in theory there could be many,
// // but we only consider the first access receipt in an information resource. Not perfect, but makes it easier right now.
// const receipt = store.value.getSubjects(RDF("type"), INTEROP("AccessReceipt"), null).map(t => t.value)
const accessReceipt = state.informationResourceStore.getSubjects(RDF("type"), INTEROP("AccessReceipt"), null).map(t => t.value)[0]

const provisionDates = computed(() => state.informationResourceStore.getObjects(accessReceipt, INTEROP("providedAt"), null).map(t => t.value))
const accessRequests = computed(() => state.informationResourceStore.getObjects(accessReceipt, AUTH("hasAccessRequest"), null).map(t => t.value))
const accessAuthorizations = computed(() => state.informationResourceStore.getObjects(accessReceipt, INTEROP("hasAccessAuthorization"), null).map(t => t.value))

// get access request data

state.accessRequestStore = await getResource(accessRequests.value[0], session)
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
  .then((txt) => parseToN3(txt, accessRequests.value[0]))
  .then((parsedN3) => (state.accessRequestStore = parsedN3.store));

const purpose = computed(() => state.accessRequestStore.getObjects(null, GDPRP("purposeForProcessing"), null)[0]?.value);

// check which Access Request this Access Receipt belongs to and notify the parent component, e.g. for filtering.
watch(() => accessRequests.value,
  () => {
    if (accessRequests.value.length > 0) {
      emit("isReceiptForRequests", accessRequests.value)
    }
  }, {immediate: true})

//
// revoke access
//


// keep track of which children access authorizations are alreay revoked
const emptyAuthorizations = ref([] as string[])

// when a child access authorization emits event that it is empty, i.e. revoked
function addToEmpty(emptyAuth: string) {
  emptyAuthorizations.value.push(emptyAuth)
}

// keep track of which children access authorizations did not yet revoked rights
// to keep track if this access receipt is revoked yet
const nonEmptyAuthorizations = computed(() => accessAuthorizations.value.filter(auth => !emptyAuthorizations.value.includes(auth)))


// a quick and dirty wrapper for type-saftey
type replacedAuthorizationWrapper = { newAuthorization: string, oldAuthorization: string }
/**
 * ensure synchronous operations
 * idea: disable children while running
 */
const isWaitingForAccessAuthorizations = ref(false)
// keep track of which children access authorizations already revoked rights
const replacedAccessAuthorizations = ref([] as replacedAuthorizationWrapper[])

/**
 * Trigger children access authorizations to revoke rights,
 * wait until all children have done so,
 * then upate this access receipt
 */
async function revokeRights() {
  // trigger access authorizations to revoke rights
  isWaitingForAccessAuthorizations.value = true // use this as trigger
  // wait on all the not yet empty (i.e. revoked) access authorizations
  while (replacedAccessAuthorizations.value.length !== nonEmptyAuthorizations.value.length) {
    console.log("Waiting for access authorizations to be revoked ...");
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  // then removeAccessAuthroizations
  await updateAccessReceipt(replacedAccessAuthorizations.value)
  isWaitingForAccessAuthorizations.value = false

  if (props.redirect) {
    window.open(
      `${props.redirect}?uri=${encodeURIComponent(
        props.informationResourceURI
      )}`,
      "_self"
    );
  }
}

/**
 *
 * When a children access authorization is updated, we add it to the replace list
 * and update access receipt accrodingly
 * @param newAuthorization
 * @param oldAuthorization
 */
async function updateAccessAuthorization(newAuthorization: string, oldAuthorization: string) {
  replacedAccessAuthorizations.value.push({newAuthorization, oldAuthorization})
  // if this component is waiting, do nothing, we will handle this in batch
  if (isWaitingForAccessAuthorizations.value) {
    return
  }
  // else, just remove this one data authorization from the event
  await updateAccessReceipt([{newAuthorization, oldAuthorization}])
    .then(() => replacedAccessAuthorizations.value.length = 0) // reset replaced, because otherwise old URIs are in cache

  if (props.redirect) {
    window.open(
      `${props.redirect}?uri=${encodeURIComponent(
        props.informationResourceURI
      )}`,
      "_self"
    );
  }
}

/**
 * Update the access receipt, replace the access authorizations as queued up in the list
 * @param replacedAuthorization
 */
async function updateAccessReceipt(replacedAuthorization: replacedAuthorizationWrapper[]) {
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
    await patchResource(props.informationResourceURI, patchBody, session)
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
    state.informationResourceStore.removeQuad(new NamedNode(accessReceipt), new NamedNode(INTEROP("hasAccessAuthorization")), new NamedNode(pairAuthorization.oldAuthorization))
    state.informationResourceStore.addQuad(new NamedNode(accessReceipt), new NamedNode(INTEROP("hasAccessAuthorization")), new NamedNode(pairAuthorization.newAuthorization))
  }
  state.informationResourceStore = new Store(state.informationResourceStore.getQuads(null, null, null, null))
}
</script>
