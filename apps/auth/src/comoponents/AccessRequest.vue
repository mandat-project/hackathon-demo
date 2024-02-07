<template>
  <div class="accessRequests">
    <Card>
      <template #content>
        <!-- <div class="accessRequest" v-for="request in requests" :key="request"> -->
        <div>
          <strong>Purpose: </strong>
          <a v-for="label in purposes" :key="label" :href="label">
            {{ label.split('#').pop() }}
          </a>
        </div>
        <div>
          <strong>Data requester: </strong>
          <a v-for="sender in fromSocialAgents" :key="sender" :href="sender">
            {{ senderName }}
          </a>
        </div>
        <div>
          <strong>Access will be granted to: </strong>
          <a v-for="grantee in forSocialAgents" :key="grantee" :href="grantee">
            {{ granteeName }}
          </a>
        </div>
        <div v-if="seeAlso.length > 0">
          <strong>For additional information see also: </strong>
          <a v-for="reference in seeAlso" :key="reference" :href="reference">
            {{ reference.split("/").pop() }}
          </a>
        </div>
        <div class="p-card" style="margin: 5px">
          <div>
            <strong>Access Need Groups</strong>
          </div>
          <div v-for="accessNeedGroup in accessNeedGroups" :key="accessNeedGroup"
               class="p-card  col-12 lg:col-8 lg:col-offset-2" style="margin: 5px">
            <Suspense>
              <AccessNeedGroup :resourceURI="accessNeedGroup" :forSocialAgents="forSocialAgents"
                               :accessAuthzContainer="accessAuthzContainer" :dataAuthzContainer="dataAuthzContainer"
                               :requestAuthorizationTrigger="accessAuthorizationTrigger"
                               @createdAccessAuthorization="addToAccessAuthorizations" />
              <template #fallback>
                <span>
                  Loading {{ accessNeedGroup.split("/")[accessNeedGroup.split("/").length - 1] }}
                </span>
              </template>
            </Suspense>
          </div>
          <div>
            <Button @click="grantWithAccessReceipt" type="button" class="btn btn-primary m-2"
                    :disabled="associatedAccessReceipt !== '' || accessAuthorizationTrigger">
              Authorize Request
            </Button>
            <Button @click="declineWithAccessReceipt" type="button" class="btn btn-primary m-2 p-button-danger"
                    :disabled="associatedAccessReceipt !== '' || accessAuthorizationTrigger || isPartiallyAuthorized">
              Decline Request
            </Button>
            <!-- TODO Decline -->
          </div>
        </div>
        <!-- </div> -->
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import AccessNeedGroup from "../comoponents/AccessNeedGroup.vue";
import { useSolidSession } from "@shared/composables";
import {
  getResource,
  parseToN3,
  RDF,
  INTEROP,
  XSD,
  GDPRP,
  createResource,
  AUTH, getLocationHeader, FOAF, RDFS,
} from "@shared/solid";
import { Store } from "n3";
import { useToast } from "primevue/usetoast";
import { computed, reactive, ref } from "vue";

const props = defineProps(["informationResourceURI", "redirect", "dataAuthzContainer", "accessAuthzContainer", "accessReceiptContainer"]);
const emit = defineEmits(["createdAccessReceipt"])
const { authFetch } = useSolidSession();
const toast = useToast();

const state = reactive({
  informationResourceStore: new Store(),
  senderStore: new Store(),
  granteeStore: new Store()
});

// get data
state.informationResourceStore = await getResource(props.informationResourceURI, authFetch.value)
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
  .then((parsedN3) => (state.informationResourceStore = parsedN3.store));

// compute properties to display

// // because we get the information resource URI, we need to find the Access Request URI, in theory there could be many,
// // but we only consider the first access request in an information resource. Not perfect, but makes it easier right now.
// const requests = store.value.getSubjects(RDF("type"), INTEROP("AccessRequest"), null).map(t => t.value)
const accessRequest = state.informationResourceStore.getSubjects(RDF("type"), INTEROP("AccessRequest"), null).map(t => t.value)[0]

const purposes = computed(() => state.informationResourceStore.getObjects(accessRequest, GDPRP('purposeForProcessing'), null).map(t => t.value))
const fromSocialAgents = computed(() => state.informationResourceStore.getObjects(accessRequest, INTEROP("fromSocialAgent"), null).map(t => t.value))
const forSocialAgents = computed(() => {
  const forSocialAgentsDirect = state.informationResourceStore.getObjects(accessRequest, INTEROP("forSocialAgent"), null).map(t => t.value)
  if (forSocialAgentsDirect.length > 0) {
    return forSocialAgentsDirect
  }
  return fromSocialAgents.value
})
const seeAlso = computed(() => state.informationResourceStore.getObjects(accessRequest, RDFS("seeAlso"), null).map(t => t.value))
const accessNeedGroups = computed(() => state.informationResourceStore.getObjects(accessRequest, INTEROP("hasAccessNeedGroup"), null).map(t => t.value))

// get access request address data

state.senderStore = await getResource(fromSocialAgents.value[0], authFetch.value)
  .catch((err) => {
    toast.add({
      severity: "error",
      summary: "Could not get sender!",
      detail: err,
      life: 5000,
    });
    throw new Error(err);
  })
  .then((resp) => resp.text())
  .then((txt) => parseToN3(txt, fromSocialAgents.value[0]))
  .then((parsedN3) => (state.senderStore = parsedN3.store));

state.granteeStore = await getResource(forSocialAgents.value[0], authFetch.value)
  .catch((err) => {
    toast.add({
      severity: "error",
      summary: "Could not get grantee!",
      detail: err,
      life: 5000,
    });
    throw new Error(err);
  })
  .then((resp) => resp.text())
  .then((txt) => parseToN3(txt, forSocialAgents.value[0]))
  .then((parsedN3) => (state.granteeStore = parsedN3.store));

const senderName = computed(() => state.senderStore.getObjects(null, FOAF("name"), null)[0]?.value);
const granteeName = computed(() => state.granteeStore.getObjects(null, FOAF("name"), null)[0]?.value);

//
// authorize access request
//

// know which access receipt this component created
const associatedAccessReceipt = ref("")

// define a 'local name', i.e. the URI fragment, for the access receipt URI
const accessReceiptLocalName = "accessReceipt"

// keep track of which children access needs already created a access authorization
const accessAuthorizations = reactive(new Map());
// be able to trigger children to authoirze access need groups (create access authorizations and trigger their children)
const accessAuthorizationTrigger = ref(false)
// when a child access need emits their authoirzed event, add the access authorization to the map to keep record
function addToAccessAuthorizations(accessNeedGroup: string, accessAuthorization: string) {
  accessAuthorizations.set(accessNeedGroup, accessAuthorization)
}

/**
 * TODO manage partial decision
 * related to denying single things
 *
 * see the commented buttons of access need and group
 *
 * <!-- DO NOT REMOVE -->
 */
const isPartiallyAuthorized = computed(() => accessAuthorizations.size > 0)


/**
 * Trigger children access need groups to create access authorization and trigger their children,
 * wait until all children have done so,
 * then create access receipt and emit finish event to parent,
 * if redirect present,
 * redirect
 */
async function grantWithAccessReceipt() {
  // trigger access grants
  accessAuthorizationTrigger.value = true
  // wait until all events fired
  while (accessAuthorizations.size !== accessNeedGroups.value.length) {
    console.log("Waiting for access receipt ...");
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  // create access receipt
  const accessReceiptLocation = createAccessReceipt(
    [...accessAuthorizations.values()]
  )
  // emit to overview
  associatedAccessReceipt.value = (await accessReceiptLocation) + "#" + accessReceiptLocalName
  emit("createdAccessReceipt", props.informationResourceURI, associatedAccessReceipt.value)
  // redirect if wanted
  if (props.redirect) {
    window.open(
      `${props.redirect}?uri=${encodeURIComponent(
        accessRequest
      )}&result=1`,
      "_self"
    );
  }
}

/**
 *  Create a new access receipt.
 *
 * ? This could potentially be extracted to a library.
 *
 * @param accessAuthorizations
 */
async function createAccessReceipt(
  accessAuthorizations: string[]
) {
  const date = new Date().toISOString();
  let payload = `
    @prefix interop:<${INTEROP()}> .
    @prefix xsd:<${XSD()}> .
    @prefix auth:<${AUTH()}> .

    <#${accessReceiptLocalName}>
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
  return createResource(props.accessReceiptContainer, payload, authFetch.value)
    .then((loc) => {
        toast.add({
          severity: "success",
          summary: "Access Receipt created.",
          life: 5000,
        })
        return getLocationHeader(loc)
      }
    )
    .catch((err) => {
      toast.add({
        severity: "error",
        summary: "Failed to create Access Receipt!",
        detail: err,
        life: 5000,
      });
      throw new Error(err);
    })

}

/**
 * Decline a request.
 * Create an access receipt that does not link to any access authorizations
 */
async function declineWithAccessReceipt() {
  // create receipt
  const accessReceiptLocation = createAccessReceipt([])
  // emit to overview
  associatedAccessReceipt.value = (await accessReceiptLocation) + "#" + accessReceiptLocalName
  emit("createdAccessReceipt", props.informationResourceURI, associatedAccessReceipt.value)
  // redirect if wanted
  if (props.redirect) {
    window.open(
      `${props.redirect}?uri=${encodeURIComponent(
        accessRequest
      )}&result=0`,
      "_self"
    );
  }
}

</script>
