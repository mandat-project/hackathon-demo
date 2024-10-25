<template>
  <div class="p-3 grid">
    <a
      class="col-12"
      :href="resourceURI"
    >
      {{ resourceURI.split("/").pop() }}
    </a>
    <div class="col-4">
      <div class="text-black-alpha-60">
        Grant date:
      </div>
            <DateFormatted :datetimeString="date" v-for="date in grantDates" :key="date"/>
    </div>
    <div class="col-4">
      <div class="text-black-alpha-60">
        Grantees:
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
        Access Need Groups:
      </div>
      <a
        v-for="accessNeedGroup in accessNeedGroups"
        :key="accessNeedGroup"
        :href="accessNeedGroup"
      >
        {{ accessNeedGroup.split("/").pop() }}
      </a>
    </div>
        <div v-if="dataAuthorizations.length > 0" class="col-12 grid">
      <div class="col-12">
        <!-- TODO Freeze -->
        <!-- <Button @click="freezeAuthorizations()" type="button" style="margin: 20px"
              class="p-button-warning">
              Freeze
          </Button> -->
              <Button @click="revokeAccessAuthorizationRights" type="button" class="my-3" severity="secondary"
                  :disabled="isWaitingForDataAuthorizations">
          Revoke Authorizations in this group
        </Button>
      </div>
      <div class="col-12">
        <Accordion
          v-if="dataAuthorizations.length"
          class="border-1 border-round border-bluegray-100"
          value="0"
        >
          <AccordionTab header="Data Authorizations">
            <div
              v-for="dataAuthorization in dataAuthorizations"
              :key="dataAuthorization"
            >
              <Suspense>
                    <DataAuthorization :resourceURI="dataAuthorization"
                                       :groupRevokationTrigger="isWaitingForDataAuthorizations"
                  @revokedDataAuthorization="removeDataAuthorization"
                />
                <template #fallback>
                  <span>
                    Loading Data Authorization {{ dataAuthorization.split("/")[dataAuthorization.split("/").length - 1] }}
                  </span>
                </template>
              </Suspense>
            </div>
          </AccordionTab>
        </Accordion>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DataAuthorization from "@/components/receipts/DataAuthorization";
import {DateFormatted} from "@shared/components";
import {useToast} from "primevue/usetoast";
import {inject, watch} from "vue";

const props = defineProps([
    "resourceURI",
    "redirect",
    "forSocialAgents",
    "receipRevokationTrigger",
]);
const emit = defineEmits(["updatedAccessAuthorization", "isEmptyAuthorization"])
const toast = useToast();

const getAccessAuthorization = inject('useAuthorizations:getAccessAuthorization');

const {
  revokeAccessAuthorizationRights,
  removeDataAuthorization,

  grantDates,
  grantees,
  accessNeedGroups,
  dataAuthorizations,
  granteeName,
  isWaitingForDataAuthorizations,
  revokedDataAuthorizations,
} = await getAccessAuthorization(props.resourceURI, props.forSocialAgents);

watch(props.receipRevokationTrigger, () => revokeAccessAuthorizationRights());
</script>

<style scoped>
</style>
