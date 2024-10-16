<template>
  <div class="grid m-0 gap-0">
    <div class="col-12 lg:col p-0">
      <p class="mb-0 text-black-alpha-60">Access need for required data format:</p>
      <a v-for="shapeTree in registeredShapeTrees" :key="shapeTree" :href="shapeTree">
        {{ shapeTree.split("#").pop() }}
      </a>
    </div>
    <div class="col-12 lg:col p-0">
      <p class="mb-0 text-black-alpha-60">Access need for container:</p>
      <a v-for="container in containers" :key="container" :href="container">
        {{ container.split("/").reverse()[1] }}
      </a>
    </div>
    <div v-if="dataInstances.length > 0" class="col-12 lg:col p-0">
      <p class="mb-0 text-black-alpha-60">Access need for resources:</p>
      <a v-for="dataInstance in dataInstances" :key="dataInstance" :href="dataInstance">
        {{ dataInstance.split("/").pop() }}
      </a>
    </div>
    <div class="col-12 lg:col p-0">
      <p class="mb-0 text-black-alpha-60">Access Mode:</p>
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
</style>

<script setup lang="ts">
import {useAuthorizations} from "@shared/composables";
import {useToast} from "primevue/usetoast";
import {ref, watch} from "vue";

const props = defineProps(["resourceURI", "redirect", "forSocialAgents", "groupAuthorizationTrigger"]);

const { getAccessNeed } = useAuthorizations();

const {
  grantDataAuthorization,
  accessModes,
  registeredShapeTrees,
  dataInstances,
  containers,
} = await getAccessNeed(props.resourceURI, props.forSocialAgents);

// const emit = defineEmits(["createdDataAuthorization", "noDataRegistrationFound"])
const toast = useToast();
// know which data authorization this component created
const associatedDataAuthorization = ref("")

// check if this component is being triggered to authorize by its parent component
watch(() => props.groupAuthorizationTrigger, () => {
  // if data authorization already exists for this access need, do nothing
  if (associatedDataAuthorization.value) {
    return
  }
  // else create a new data authroization and set acls
  grantDataAuthorization()
})


</script>
