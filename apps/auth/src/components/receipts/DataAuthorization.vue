<template>
  <div class="grid">
    <div class="col-4">
      <div class="text-black-alpha-60">
        {{ $t("dataAuthorization.accessNeeds") }}
      </div>
      <a
        v-for="accessNeed in accessNeeds"
        :key="accessNeed"
        :href="accessNeed"
      >
        {{ accessNeed.split("/").pop() }}
      </a>
    </div>
    <div class="col-4">
      <div class="text-black-alpha-60">
        {{ $t("dataAuthorization.grantees") }}
      </div>
      <a
        v-for="grantee in grantees"
        :key="grantee"
        :href="grantee"
      >
        {{ granteeName }}
      </a>
    </div>
    <div class="col-4">
      <div class="text-black-alpha-60">
        {{ $t("dataAuthorization.authorizedData") }}
      </div>
      <a
        v-for="shapeTree in registeredShapeTrees"
        :key="shapeTree"
        :href="shapeTree"
      >
        {{ shapeTree.split("#").pop() }}
      </a>
    </div>
    <div class="col-4">
      <div class="text-black-alpha-60">
        {{ $t("dataAuthorization.scope") }}
      </div>
      <a
        v-for="scope in scopes"
        :key="scope"
        :href="scope"
      >
        {{ scope.split("#")[1] }}
      </a>
    </div>
    <div class="col-4">
      <div class="text-black-alpha-60">
        {{ $t("dataAuthorization.registration") }}
      </div>
      <a
        v-for="dataRegistration in dataRegistrations"
        :key="dataRegistration"
        :href="dataRegistration"
      >
        {{ dataRegistration.split("/").reverse()[1] }}
      </a>
    </div>
    <div
      v-if="dataInstances.length > 0"
      class="col-4"
    >
      <div class="text-black-alpha-60">
        {{ $t("dataAuthorization.instances") }}
      </div>
      <a
        v-for="dataInstance in dataInstances"
        :key="dataInstance"
        :href="dataInstance"
      >
        {{ dataInstance.split("/").pop() }}
      </a>
    </div>
    <div class="col-4">
      <div class="text-black-alpha-60">
        {{ $t("dataAuthorization.accessMode") }}
      </div>
      <a
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
            <Button @click="revokeDataAuthorizationRights" type="button" class="my-3" severity="secondary"
                :disabled="groupRevokationTrigger">
              {{ $t("dataAuthorization.revoke") }}
            </Button>
        </div>
    </div>
</template>

<script setup lang="ts">
import {useDataAuthorization} from "@shared/composables";
import {useToast} from "primevue/usetoast";
import {watch} from "vue";

const props = defineProps(["resourceURI", "groupRevokationTrigger"]);
const emit = defineEmits(["revokedDataAuthorization"])

const toast = useToast();

const {
  revokeDataAuthorizationRights,

  accessModes,
  registeredShapeTrees,
  dataInstances,
  dataRegistrations,
  grantees,
  scopes,
  accessNeeds,
  granteeName,
} = await useDataAuthorization(props.resourceURI);

// check if this component is being triggered to revoke from its parent
watch(() => props.groupRevokationTrigger, () => {
    if (props.groupRevokationTrigger) {
        revokeDataAuthorizationRights()
    }
})

</script>

<style scoped>
</style>
