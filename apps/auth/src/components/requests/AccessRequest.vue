<template>
  <Card>
    <template #title>
      Access Request {{ props.informationResourceURI }}
    </template>
    <template #content>
      <div class="grid">
        <div class="col-12 md:col">
          <div class="text-black-alpha-60">
            Purpose:
          </div>
          <a
            v-for="label in purposes"
            :key="label"
            :href="label"
          >
            {{ label.split('#').pop() }}
          </a>
        </div>
        <div class="col-12 md:col">
          <div class="text-black-alpha-60">
            Data requester:
          </div>
          <a
            v-for="sender in fromSocialAgents"
            :key="sender"
            :href="sender"
          >
            {{ senderName }}
          </a>
        </div>
        <div class="col-12 md:col">
          <div class="text-black-alpha-60">
            Access will be granted to:
          </div>
          <a
            v-for="grantee in forSocialAgents"
            :key="grantee"
            :href="grantee"
          >
            {{ granteeName }}
          </a>
        </div>
        <div
          v-if="seeAlso.length > 0"
          class="col-12 md:col"
        >
          <div class="text-black-alpha-60">
            For additional information see also:
          </div>
          <a
            v-for="reference in seeAlso"
            :key="reference"
            :href="reference"
          >
            {{ reference.split("/").pop() }}
          </a>
        </div>

        <Accordion class="col-12 surface-50 border-round" value="0">
            <AccordionTab header="Access Need Groups">
              <div v-for="accessNeedGroup in accessNeedGroups" :key="accessNeedGroup">
                <Suspense>
                  <AccessNeedGroup :parentURI="parentURI"
                                   :resourceURI="accessNeedGroup"
                                   :redirect="redirect"
                                   :forSocialAgents="forSocialAgents"
                                   :requestAuthorizationTrigger="grantTrigger"

                                   @createdAccessAuthorization="addToAccessAuthorizations"
                                   @noDataRegistrationFound="setNoDataRegistrationFound"/>
                  <template #fallback>
                    <span>
                      Loading Access Need Group {{ accessNeedGroup.split("/")[accessNeedGroup.split("/").length - 1] }}
                    </span>
                  </template>
                </Suspense>
              </div>
              <div v-if="noDataRegistrationFound" class="col-12 md:col">
                <div class="text-black-alpha-60">No matching Data Registrations were found for: </div>
                <a v-for="shapeTree in shapeTreesOfMissingDataRegs" :key="shapeTree.toString()" :href="shapeTree.toString()">
                  {{ shapeTree.split('#').pop() }}
                </a>
              </div>
            </AccordionTab>
        </Accordion>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-content-end border-top-1 gap-2 pt-3 -mt-3 border-blue-100">
        <Button
          severity="primary"
          type="button"
          :disabled="associatedAccessReceipt !== '' || grantTrigger || noDataRegistrationFound"
          @click="confirmGrantWithAccessReceipt"
        >
          Authorize Request
        </Button>
        <Button
          type="button"
          severity="secondary"
          :disabled="associatedAccessReceipt !== '' || grantTrigger || isPartiallyAuthorized || noDataRegistrationFound"
          @click="confirmDeclineWithAccessReceipt"
        >
          Decline Request
        </Button>
      </div>
    </template>
  </Card>
  <ConfirmDialog />
</template>

<script setup lang="ts">
import AccessNeedGroup from "@/components/requests/AccessNeedGroup";
import {useAuthorizations} from "@shared/composables";
import {useConfirm} from "primevue/useconfirm";
import {useToast} from "primevue/usetoast";
import {computed, reactive, ref} from "vue";

const props = defineProps(["informationResourceURI", "redirect", "parentURI"]);

const { getAccessRequest } = useAuthorizations(props.parentURI);

const {
  grantWithAccessReceipt,
  declineWithAccessReceipt,

  grantTrigger,

  purposes,
  fromSocialAgents,
  forSocialAgents,
  seeAlso,
  accessNeedGroups,
  senderName,
  granteeName,
} = await getAccessRequest(props.informationResourceURI, props.redirect);

const toast = useToast();
const confirm = useConfirm();

// set if no matching data registrations are found for any of the child elements registeredShapeTrees
const noDataRegistrationFound = ref(false);
const shapeTreesOfMissingDataRegs = ref([] as string[]);

//
// authorize access request
//

// know which access receipt this component created
const associatedAccessReceipt = ref("")

// keep track of which children access needs already created a access authorization
const accessAuthorizations = reactive(new Map());

// when a child access need emits their authoirzed event, add the access authorization to the map to keep record
function addToAccessAuthorizations(accessNeedGroup: string, accessAuthorization: string) {
  accessAuthorizations.set(accessNeedGroup, accessAuthorization)
}

function setNoDataRegistrationFound(shapeTreeURI: string) {
  noDataRegistrationFound.value = true;
  shapeTreesOfMissingDataRegs.value.push(shapeTreeURI);
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

function confirmGrantWithAccessReceipt(): void {

  confirm.require({
    message: 'Are you sure you want to proceed?',
    header: 'Authorize Access Request',
    rejectLabel: 'Cancel',
    acceptLabel: 'Authorize Request',
    accept: () => {
      // TODO add authorizations from groups and data-authorizations
      grantWithAccessReceipt();
    },
    reject: () => {
      //
    },
  });
}

function confirmDeclineWithAccessReceipt(): void {
  confirm.require({
    message: 'Are you sure you want to proceed?',
    header: 'Decline Access Request',
    acceptClass: 'p-button-danger',
    rejectLabel: 'Cancel',
    acceptLabel: 'Decline Request',
    accept: () => {
      declineWithAccessReceipt();
    },
    reject: () => {
      //
    },
  });
}

</script>

<style scoped>
</style>
