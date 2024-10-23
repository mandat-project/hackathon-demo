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
      <AccessNeed :parentURI="parentURI"
                  :resourceURI="accessNeed"
                  :forSocialAgents="forSocialAgents"
                  :groupAuthorizationTrigger="grantTrigger"
                  @createdDataAuthorization="addToDataAuthorizations"
                  @noDataRegistrationFound="setNoDataRegistrationFound"/>
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
import {inject, reactive, ref, watch} from "vue";

const props = defineProps(["parentURI", "resourceURI", "redirect", "forSocialAgents", "requestAuthorizationTrigger"]);
const emit = defineEmits(["createdAccessAuthorization", "noDataRegistrationFound"])

// const { getAccessNeedGroup } = useAuthorizations(props.parentURI);
const getAccessNeedGroup = inject('useAuthorizations:getAccessNeedGroup');

const {
  grantAccessAuthorization,

  grantTrigger,

  accessNeeds,
  prefLabels,
  definitions,
} = await getAccessNeedGroup(props.resourceURI, props.forSocialAgents);

//
// Authorize Access Need Group
//

// know which access authorization this component created
const associatedAccessAuthorization = ref("")

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

// when a child access need emits their authoirzed event, add the data authorization to the map to keep record
function addToDataAuthorizations(accessNeed: string, dataAuthorization: string) {
  dataAuthorizations.set(accessNeed, dataAuthorization)
}

function setNoDataRegistrationFound(shapeTreeUri: string) {
  emit("noDataRegistrationFound", shapeTreeUri);
}

</script>

<style scoped>
</style>
