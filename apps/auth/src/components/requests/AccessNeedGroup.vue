<template>
  <div>
    <span class="text-black-alpha-60">Short description of requested access: </span>
    <div
      v-for="label in prefLabels"
      :key="label"
    >
      {{ label }}
    </div>
  </div>
  <div class="mt-3">
    <span class="text-black-alpha-60">Explanation: </span>
    <div
      v-for="definition in definitions"
      :key="definition"
    >
      {{ definition }}
    </div>
  </div>

  <div
    v-for="accessNeed in accessNeeds"
    :key="accessNeed"
  >
    <Suspense>
      <AccessNeed :resourceURI="accessNeed" :forSocialAgents="forSocialAgents"
                  :dataAuthzContainer="dataAuthzContainer"
                  @createdDataAuthorization="addToDataAuthorizations"
                  @noDataRegistrationFound="setNoDataRegistrationFound"
                  :groupAuthorizationTrigger="dataAuthorizationTrigger" />
      <template #fallback>
        <p>
          Loading Access Need {{ accessNeed.split("/")[accessNeed.split("/").length - 1] }}
        </p>
      </template>
    </Suspense>
  </div>
  <!-- DO NOT REMOVE -->
  <!--
  <Button @click="grantAccessAuthorization" type="button" class="mb-2"
          :disabled="associatedAccessAuthorization !== '' || requestAuthorizationTrigger || noDataRegistrationFound">
    Authorize Group
  </Button> -->
</template>

<script setup lang="ts">
import AccessNeed from "@/components/requests/AccessNeed";
import {useSolidProfile, useSolidSession} from "@shared/composables";
import {
  getResource,
  parseToN3,
  INTEROP,
  SKOS,
  createResource,
  getLocationHeader,
  XSD,
} from "@shared/solid";
import {Store} from "n3";
import {useToast} from "primevue/usetoast";
import {computed, reactive, ref, watch} from "vue";

const props = defineProps(["resourceURI", "redirect", "forSocialAgents", "accessAuthzContainer", "dataAuthzContainer", "requestAuthorizationTrigger"]);
const emit = defineEmits(["createdAccessAuthorization", "noDataRegistrationFound"])
const { session } = useSolidSession();
const { memberOf } = useSolidProfile()
const toast = useToast();

// get data
const store = ref(new Store());
store.value = await getResource(props.resourceURI, session)
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
  .then((parsedN3) => (store.value = parsedN3.store));

// compute properties
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
  await getResource(descriptionResource, session)
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
// Authorize Access Need Group
//

// know which access authorization this component created
const associatedAccessAuthorization = ref("")

// define a 'local name', i.e. the URI fragment, for the access authorization URI
const accessAuthzLocalName = "accessAuthorization"

// check if this component is being triggered to authorize by its parent component
watch(() => props.requestAuthorizationTrigger, () => {
  // if access authorization already exists for this access need group, do nothing
  if (associatedAccessAuthorization.value) {
    return
  }
  // else create a new access authroization and trigger children
  grantAccessAuthorization()
})

// keep track of which children access needs already created a data authorization
const dataAuthorizations = reactive(new Map());
// be able to trigger children to authoirze access needs (create data authorizations and set acls)
const dataAuthorizationTrigger = ref(false)

// when a child access need emits their authoirzed event, add the data authorization to the map to keep record
function addToDataAuthorizations(accessNeed: string, dataAuthorization: string) {
  dataAuthorizations.set(accessNeed, dataAuthorization)
}

function setNoDataRegistrationFound(shapeTreeUri: string) {
  emit("noDataRegistrationFound", shapeTreeUri);
}

/**
 * Trigger children access needs to create data authorization and set acls,
 * wait until all children have done so,
 * then create access authorization and emit finish event to parent
 */
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

/**
 *  Create a new access authorization.
 *
 * ? This could potentially be extracted to a library.
 *
 * @param forSocialAgents
 * @param dataAuthorizations
 */
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
      interop:grantedBy <${memberOf.value}> ;
      interop:grantedAt "${date}"^^xsd:dateTime ;
      interop:grantee ${forSocialAgents
    .map((t) => "<" + t + ">")
    .join(", ")} ;
      interop:hasAccessNeedGroup <${props.resourceURI}> ;
      interop:hasDataAuthorization ${dataAuthorizations
    .map((t) => "<" + t + ">")
    .join(", ")} .
`;
  return createResource(props.accessAuthzContainer, payload, session)
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

<style scoped>
</style>
