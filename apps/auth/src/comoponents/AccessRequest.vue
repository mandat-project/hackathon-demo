<template>
  <div class="accessRequests">
    <Card>
      <template #content>
        <!-- <div class="accessRequest" v-for="request in requests" :key="request"> -->
        <div>
          <strong>Purpose: </strong>
          <span v-for="label in purposes" :key="label">
            {{ label }}
          </span>
        </div>
        <div>
          <strong>To: </strong>
          <a v-for="recipient in toSocialAgents" :key="recipient" :href="recipient">
            {{ recipient }}
          </a>
        </div>
        <div>
          <strong>From: </strong>
          <a v-for="sender in fromSocialAgents" :key="sender" :href="sender">
            {{ sender }}
          </a>
        </div>
        <div>
          <strong>For: </strong>
          <a v-for="grantee in forSocialAgents" :key="grantee" :href="grantee">
            {{ grantee }}
          </a>
        </div>
        <div>
          <strong>From Demand: </strong>
          <a v-for="demand in fromDemands" :key="demand" :href="demand">
            {{ demand }}
          </a>
        </div>
        <div class="p-card" style="margin: 5px">
          <div>
            <strong>Access Need Groups</strong>
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
          <div v-for="accessNeedGroup in accessNeedGroups" :key="accessNeedGroup"
            class="p-card  col-12 lg:col-8 lg:col-offset-2" style="margin: 5px">
            <Suspense>
              <AccessNeedGroup :resourceURI="accessNeedGroup" :forSocialAgents="forSocialAgents"
                :accessAuthzContainer="accessAuthzContainer" :dataAuthzContainer="dataAuthzContainer"
                :requestAuthorizationTrigger="accessAuthorizationTrigger"
                @createdAccessAuthorization="addToDataAuthorizations" />
              <template #fallback>
                <span>
                  Loading {{ accessNeedGroup.split("/")[accessNeedGroup.split("/").length - 1] }}
                </span>
              </template>
            </Suspense>
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
  CREDIT,
  AUTH, getLocationHeader,
} from "@shared/solid";
import { Store } from "n3";
import { useToast } from "primevue/usetoast";
import { computed, reactive, ref } from "vue";

const props = defineProps(["informationResourceURI", "redirect", "dataAuthzContainer", "accessAuthzContainer", "accessReceiptContainer"]);
const emit = defineEmits(["createdAccessReceipt"])
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

// const requests = store.value.getSubjects(RDF("type"), INTEROP("AccessRequest"), null).map(t => t.value)
const accessRequest = store.value.getSubjects(RDF("type"), INTEROP("AccessRequest"), null).map(t => t.value)[0]

const purposes = computed(() => store.value.getObjects(accessRequest, GDPRP('purposeForProcessing'), null).map(t => t.value))
const toSocialAgents = computed(() => store.value.getObjects(accessRequest, INTEROP("toSocialAgent"), null).map(t => t.value))
const fromSocialAgents = computed(() => store.value.getObjects(accessRequest, INTEROP("fromSocialAgent"), null).map(t => t.value))
const forSocialAgents = computed(() => {
  const forSocialAgentsDirect = store.value.getObjects(accessRequest, INTEROP("forSocialAgent"), null).map(t => t.value)
  if (forSocialAgentsDirect.length > 0) {
    return forSocialAgentsDirect
  }
  return fromSocialAgents.value
})
const fromDemands = computed(() => store.value.getObjects(accessRequest, CREDIT("fromDemand"), null).map(t => t.value))
const accessNeedGroups = computed(() => store.value.getObjects(accessRequest, INTEROP("hasAccessNeedGroup"), null).map(t => t.value))


// 
// 
// 

const accessReceiptLocalName = "accessReceipt"

const associatedAccessReceipt = ref("")

const accessAuthorizations = reactive(new Map());
const accessAuthorizationTrigger = ref(false)
function addToDataAuthorizations(accessNeedGroup: string, accessAuthorization: string) {
  accessAuthorizations.set(accessNeedGroup, accessAuthorization)
}

const isPartiallyAuthorized = computed(() => accessAuthorizations.size > 0)

/**
 * TODO manage partial decision
 * related to denying single things
 * 
 * see the commented buttons of access need and group
 * 
 * <!-- DO NOT REMOVE -->
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
