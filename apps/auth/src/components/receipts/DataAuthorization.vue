<template>
  <div class="grid">
    <div class="col-12 md:col-4">
      <div class="text-black-alpha-60">
        {{ $t("dataAuthorization.accessNeeds") }}
      </div>
      <a
        class="break-all"
        v-for="accessNeed in accessNeeds"
        :key="accessNeed"
        :href="accessNeed"
      >
        {{ accessNeed.split("/").pop() }}
      </a>
    </div>
    <div class="col-12 md:col-4">
      <div class="text-black-alpha-60">
        {{ $t("dataAuthorization.grantees") }}
      </div>
      <a v-for="grantee in grantees" :key="grantee" :href="grantee">
        {{ granteeName }}
      </a>
    </div>
    <div class="col-12 md:col-4">
      <div class="text-black-alpha-60">
        {{ $t("dataAuthorization.authorizedData") }}
      </div>
      <a
        class="break-all"
        v-for="shapeTree in registeredShapeTrees"
        :key="shapeTree"
        :href="shapeTree"
      >
        {{ shapeTree.split("#").pop() }}
      </a>
    </div>
    <div class="col-12 md:col-4">
      <div class="text-black-alpha-60">
        {{ $t("dataAuthorization.scope") }}
      </div>
      <a class="break-all" v-for="scope in scopes" :key="scope" :href="scope">
        {{ scope.split("#")[1] }}
      </a>
    </div>
    <div class="col-12 md:col-4">
      <div class="text-black-alpha-60">
        {{ $t("dataAuthorization.registration") }}
      </div>
      <a
        class="break-all"
        v-for="dataRegistration in dataRegistrations"
        :key="dataRegistration"
        :href="dataRegistration"
      >
        {{ dataRegistration.split("/").reverse()[1] }}
      </a>
    </div>
    <div v-if="dataInstances.length > 0" class="col-12 md:col-4">
      <div class="text-black-alpha-60">
        {{ $t("dataAuthorization.instances") }}
      </div>
      <a
        class="break-all"
        v-for="dataInstance in dataInstances"
        :key="dataInstance"
        :href="dataInstance"
      >
        {{ dataInstance.split("/").pop() }}
      </a>
    </div>
    <div class="col-12 md:col-4">
      <div class="text-black-alpha-60">
        {{ $t("dataAuthorization.accessMode") }}
      </div>
      <a
        class="break-all"
        v-for="accessMode in accessModes"
        :key="accessMode"
        :href="accessMode"
      >
        {{ accessMode.split("#")[1] }}
      </a>
    </div>
    <div class="col-12">
      <!-- TODO Freeze -->
      <!-- <Button @click="freezeAuthorizations()" type="button" style="margin: 20px"
                class="p-button-warning">
                Freeze
            </Button> -->
      <Button
        @click="revokeRights"
        type="button"
        class="my-3"
        severity="secondary"
        :disabled="groupRevokationTrigger"
      >
        {{ $t("dataAuthorization.revoke") }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  useSolidProfile,
  useSolidSession,
} from "@datev-research/mandat-shared-composables";
import { getDataRegistrationContainers } from "@datev-research/mandat-shared-solid-interop";
import {
  ACL,
  FOAF,
  getAclResourceUri,
  getResource,
  INTEROP,
  parseToN3,
  putResource,
  RDF,
} from "@datev-research/mandat-shared-solid-requests";
import { Store, Writer } from "n3";
import { useToast } from "primevue/usetoast";
import { computed, reactive, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps(["resourceURI", "groupRevokationTrigger"]);
const emit = defineEmits(["revokedDataAuthorization"]);
const { session } = useSolidSession();
const { memberOf } = useSolidProfile();
const toast = useToast();
const { t } = useI18n();

const state = reactive({
  resourceStore: new Store(),
  granteeStore: new Store(),
});

// get data
state.resourceStore = await getResource(props.resourceURI, session)
  .catch((err) => {
    toast.add({
      severity: "error",
      summary: t("dataAuthorization.error.dataAuthorization"),
      detail: err,
      life: 5000,
    });
    throw new Error(err);
  })
  .then((resp) => resp.data)
  .then((txt) => parseToN3(txt, props.resourceURI))
  .then((parsedN3) => (state.resourceStore = parsedN3.store));

// compute properties
const accessModes = computed(() =>
  state.resourceStore
    .getObjects(props.resourceURI, INTEROP("accessMode"), null)
    .map((t) => t.value)
);
const registeredShapeTrees = computed(() =>
  state.resourceStore
    .getObjects(props.resourceURI, INTEROP("registeredShapeTree"), null)
    .map((t) => t.value)
);
const dataInstances = computed(() =>
  state.resourceStore
    .getObjects(props.resourceURI, INTEROP("hasDataInstance"), null)
    .map((t) => t.value)
);
const dataRegistrations = computed(() =>
  state.resourceStore
    .getObjects(props.resourceURI, INTEROP("hasDataRegistration"), null)
    .map((t) => t.value)
);
const grantees = computed(() =>
  state.resourceStore
    .getObjects(props.resourceURI, INTEROP("grantee"), null)
    .map((t) => t.value)
);
const scopes = computed(() =>
  state.resourceStore
    .getObjects(props.resourceURI, INTEROP("scopeOfAuthorization"), null)
    .map((t) => t.value)
);
const accessNeeds = computed(() =>
  state.resourceStore
    .getObjects(props.resourceURI, INTEROP("satisfiesAccessNeed"), null)
    .map((t) => t.value)
);

//get grantee data
state.granteeStore = await getResource(grantees.value[0], session)
  .catch((err) => {
    toast.add({
      severity: "error",
      summary: t("dataAuthorization.error.grantee"),
      detail: err,
      life: 5000,
    });
    throw new Error(err);
  })
  .then((resp) => resp.data)
  .then((txt) => parseToN3(txt, props.resourceURI))
  .then((parsedN3) => (state.granteeStore = parsedN3.store));

const granteeName = computed(
  () => state.granteeStore.getObjects(null, FOAF("name"), null)[0]?.value
);

//
// revoke data authorization
//

// check if this component is being triggered to revoke from its parent
watch(
  () => props.groupRevokationTrigger,
  () => {
    if (props.groupRevokationTrigger) {
      revokeRights();
    }
  }
);

/**
 * Set the .acl for any resource required in this data authorization.
 */
async function revokeRights() {
  for (const shapeTree of registeredShapeTrees.value) {
    const dataRegistrations = await getDataRegistrationContainers(
      `${memberOf.value}`,
      shapeTree,
      session
    ).catch((err) => {
      toast.add({
        severity: "error",
        summary: t("dataAuthorization.error.getDataRegistrationContainers"),
        detail: err,
        life: 5000,
      });
      throw new Error(err);
    });
    const dataInstancesForNeed = [] as string[];
    dataInstancesForNeed.push(...dataInstances.value); // potentially manually edited (added/removed) in auth agent

    const accessToResources =
      dataInstancesForNeed.length > 0
        ? dataInstancesForNeed
        : dataRegistrations;
    // only grant specific resource access
    for (const resource of accessToResources) {
      await updateAccessControlListToDelete(
        resource,
        grantees.value,
        accessModes.value
      );
    }
    emit("revokedDataAuthorization", props.resourceURI);
  }
}

/**
 * Remove the rights specified in this data authorization from the ACL
 * Make sure that the owner has still control as well.
 *
 * ? This could potentially be extracted to a library.
 *
 * @param accessTo
 * @param agents
 * @param modes
 */
async function updateAccessControlListToDelete(
  accessTo: string,
  agents: string[],
  modes: string[]
) {
  const aclURI = await getAclResourceUri(accessTo, session);

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

  // await patchResource(aclURI, patchBody, session).catch(
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
   * * cannot have mutliple matches for where clause on server side (results in status 409)
   * * no matches for where clause on server side (results in status 409)
   *
   */

  //  therefore...

  const aclStore = await getResource(aclURI, session)
    .catch((err) => {
      toast.add({
        severity: "error",
        summary: t("dataAuthorization.error.loadACL"),
        detail: err,
        life: 5000,
      });
      throw new Error(err);
    })
    .then((resp) => resp.data)
    .then((txt) => parseToN3(txt, aclURI))
    .then((parsedN3) => parsedN3.store);

  for (const agent of agents) {
    for (const mode of modes) {
      const agentAuthzQuads = aclStore
        .getQuads(null, ACL("agent"), agent, null)
        .filter(
          (quad) =>
            aclStore.getQuads(quad.subject, ACL("mode"), mode, null).length == 1
        )
        .filter(
          (quad) =>
            aclStore.getQuads(quad.subject, ACL("accessTo"), accessTo, null)
              .length == 1
        )
        .filter(
          (quad) =>
            aclStore.getQuads(quad.subject, ACL("default"), accessTo, null)
              .length == 1
        );
      aclStore.removeQuads(agentAuthzQuads);
    }
  }

  // START cleanup of authorizations where no agent is attached
  aclStore
    .getSubjects(RDF("type"), ACL("Authorization"), null)
    .filter(
      (subj) => aclStore.getQuads(subj, ACL("agent"), null, null).length == 0
    )
    .filter(
      (subj) =>
        aclStore.getQuads(subj, ACL("agentGroup"), null, null).length == 0
    )
    .filter(
      (subj) =>
        aclStore.getQuads(subj, ACL("agentClass"), null, null).length == 0
    )
    .forEach((subj) =>
      aclStore.removeQuads(aclStore.getQuads(subj, null, null, null))
    );
  // END cleanup

  const n3Writer = new Writer();
  let aclBody = n3Writer.quadsToString(
    aclStore.getQuads(null, null, null, null)
  );
  await putResource(aclURI, aclBody, session)
    .then(() =>
      toast.add({
        severity: "success",
        summary: "dataAuthorization.success.aclUpdated",
        life: 5000,
      })
    )
    .catch((err) => {
      toast.add({
        severity: "error",
        summary: t("dataAuthorization.error.updateACL"),
        detail: err,
        life: 5000,
      });
      throw new Error(err);
    });
}
</script>

<style scoped></style>
