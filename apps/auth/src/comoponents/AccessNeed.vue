<template>
  <div class="accessNeed">
    <div class="field">
      <div class="fieldLabel">Access need for required data format:</div>
      <a v-for="shapeTree in registeredShapeTrees" :key="shapeTree" :href="shapeTree">
        {{ shapeTree.split("#").pop() }}
      </a>
    </div>
    <div v-if="dataInstances.length > 0" class="field">
      <div class="fieldLabel">Access need for resources:</div>
      <a v-for="dataInstance in dataInstances" :key="dataInstance" :href="dataInstance">
        {{ dataInstance.split("/").pop() }}
      </a>
    </div>
    <div class="field">
      <div class="fieldLabel">Access Mode:</div>
      <a v-for="accessMode in accessModes" :key="accessMode" :href="accessMode">
        {{ accessMode.split("#")[1] }}
      </a>
    </div>
    <!-- DO NOT REMOVE -->
    <!-- <Button @click="grantDataAuthorization" type="button" style="margin: 20px" class="btn btn-primary"
            :disabled="associatedDataAuthorization !== '' || groupAuthorizationTrigger || noDataRegistrationFound">
      Authorize Need
    </Button> -->
  </div>
</template>


<style scoped>
.accessNeed {
  margin-top: 1rem;
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
</style>

<script setup lang="ts">
import {useSolidSession} from "@shared/composables";
import {
  getResource,
  parseToN3,
  INTEROP,
  getDataRegistrationContainers,
  LDP,
  ACL,
  AUTH,
  XSD,
  createResource,
  patchResource,
  getAclResourceUri,
  getLocationHeader,
} from "@shared/solid";
import {Store} from "n3";
import {useToast} from "primevue/usetoast";
import {computed, ref, watch} from "vue";

const props = defineProps(["resourceURI", "redirect", "forSocialAgents", "dataAuthzContainer", "groupAuthorizationTrigger"]);
const emit = defineEmits(["createdDataAuthorization", "noDataRegistrationFound"])
const { session } = useSolidSession();
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

// compute properties to display
const accessModes = computed(() =>
  store.value.getObjects(props.resourceURI, INTEROP("accessMode"), null).map(t => t.value)
)
const registeredShapeTrees = computed(() =>
  store.value.getObjects(props.resourceURI, INTEROP("registeredShapeTree"), null).map(t => t.value)
)
const dataInstances = computed(() =>
  store.value.getObjects(props.resourceURI, INTEROP("hasDataInstance"), null).map(t => t.value)
)

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


//
// Authorize Access Need
//

// know which data authorization this component created
const associatedDataAuthorization = ref("")

// define a 'local name', i.e. the URI fragment, for the data authorization URI
const dataAuthzLocalName = "dataAuthorization"

// check if this component is being triggered to authorize by its parent component
watch(() => props.groupAuthorizationTrigger, () => {
  // if data authorization already exists for this access need, do nothing
  if (associatedDataAuthorization.value) {
    return
  }
  // else create a new data authroization and set acls
  grantDataAuthorization()
})

watch(() => registeredShapeTrees.value, () => checkIfMatchingDataRegistrationExists(), {immediate:true})

async function checkIfMatchingDataRegistrationExists() {
  const dataRegistrations = await getDataRegistrationContainers(
    `${session.webId}`,
    registeredShapeTrees.value[0],
    session
  ).catch((err) => {
    toast.add({
      severity: "error",
      summary: "Error on getDataRegistrationContainers!",
      detail: err,
      life: 5000,
    });
    throw new Error(err);
  });
  if (dataRegistrations.length <= 0) {
    emit("noDataRegistrationFound", registeredShapeTrees.value[0])
  }
}


/**
 * Set the .acl for any resource required in this access need.
 */
async function grantDataAuthorization() {
  // find registries
  for (const shapeTree of registeredShapeTrees.value) {
    const dataRegistrations = await getDataRegistrationContainers(
      `${session.webId}`,
      shapeTree,
      session
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
    const dataAuthzLocation = createDataAuthorization(props.forSocialAgents, registeredShapeTrees.value, accessModes.value, dataRegistrations, dataInstancesForNeed);
    // if selected data instances given, then only give access to those, else, give to registration
    const accessToResources = dataInstancesForNeed.length > 0 ? dataInstancesForNeed : dataRegistrations;
    // only grant specific resource access
    for (const resource of accessToResources) {
      await updateAccessControlList(resource, props.forSocialAgents, accessModes.value);
    }
    associatedDataAuthorization.value = (await dataAuthzLocation) + "#" + dataAuthzLocalName
    emit("createdDataAuthorization", props.resourceURI, associatedDataAuthorization.value)
  }
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

  return createResource(props.dataAuthzContainer, payload, session)
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
async function updateAccessControlList(
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
            acl:agent <${session.webId}>;
            acl:default <.${accessTo.substring(accessTo.lastIndexOf('/'))}>;
            acl:mode acl:Read, acl:Write, acl:Control.

        <#grantee-${new Date().toISOString()}>
            a acl:Authorization;
            acl:accessTo <.${accessTo.substring(accessTo.lastIndexOf('/'))}>;
            acl:agent ${agent.map((a) => "<" + a + ">").join(", ")};
            acl:default <.${accessTo.substring(accessTo.lastIndexOf('/'))}>;
            acl:mode ${mode.map((mode) => "<" + mode + ">").join(", ")} .
    } .` // n3 patch may not contain blank node, so we do the next best thing, and try to generate a unique name
  const aclURI = await getAclResourceUri(accessTo, session);
  await patchResource(aclURI, patchBody, session).catch(
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

</script>
