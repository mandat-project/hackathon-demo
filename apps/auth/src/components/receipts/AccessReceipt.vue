<template>
  <div class="accessReceipt">
    <Card>
      <template #title>
        <div class="mb-3">
          <Chip
            :label="status"
            :class="{'bg-green-300': status === 'Active', 'bg-red-500': status === 'Revoked', 'text-white': status === 'Revoked', 'text-sm': true}"
          />
        </div>
        Authorization
      </template>

      <template #content>
        <div class="grid">
          <!-- <div class="accessRequest" v-for="request in requests" :key="request"> -->
          <div class="col-12">
            <div class="text-black-alpha-60">Provided At: </div>
            <DateFormatted :datetimeString="date" v-for="date in provisionDates" :key="date" />
          </div>
          <div class="col-12 md:col">
            <div class="text-black-alpha-60">
              For Access Request:
            </div>
            <a
              v-for="accessRequest in accessRequests"
              :key="accessRequest"
              :href="accessRequest"
            >
              {{ accessRequest.split("/").pop() }}
            </a>
          </div>
          <div class="col-12 md:col">
            <div class="text-black-alpha-60">
              Purpose:
            </div>
            <a :href="purpose">
              {{ purpose.split("#").pop() }}
            </a>
          </div>
          <div class="col-12">
            <Accordion v-if="accessAuthorizations.length" value="0" class="surface-50 border-round">
            <AccordionTab header="Access Authorizations">
              <div v-for="accessAuthorization in accessAuthorizations" :key="accessAuthorization">
                <Suspense>
                  <AccessAuthorization :resourceURI="accessAuthorization"
                                       :receipRevokationTrigger="isWaitingForAccessAuthorizations"
                                       @updatedAccessAuthorization="updateAccessAuthorization"
                                       />
                  <template #fallback>
                                <span>
                                    Loading {{
                                    accessAuthorization.split("/")[accessAuthorization.split("/").length - 1]
                                  }}
                                </span>
                  </template>
                </Suspense>
              </div>
            </AccordionTab>
          </Accordion>
          </div>
        </div>
      </template>
      <template #footer>
        <div
          v-if="!isRevokedOrDenied"
          class="flex justify-content-end border-top-1 pt-3 -mt-5 border-blue-100"
        >
          <!-- TODO Freeze -->
          <!-- <Button @click="freezeAuthorizations()" type="button" style="margin: 20px"
  class="p-button-warning">
  Freeze
</Button> -->
          <Button @click="revokeAccessReceiptRights" type="button" severity="danger"
                  :disabled="isWaitingForAccessAuthorizations">
            Revoke All
          </Button>
        </div>

      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import AccessAuthorization from "@/components/receipts/AccessAuthorization";
import {DateFormatted} from "@shared/components";
import {useAccessReceipt} from "@shared/composables";
import {useToast} from "primevue/usetoast";

const props = defineProps(["informationResourceURI", "redirect"]);
const emit = defineEmits(["isReceiptForRequests"])

const toast = useToast();

const {
  revokeAccessReceiptRights,
  updateAccessAuthorization,

  provisionDates,
  accessRequests,
  accessAuthorizations,
  purpose,
  isRevokedOrDenied,
  status,
  isWaitingForAccessAuthorizations,
} = await useAccessReceipt(props.informationResourceURI, props.redirect);

</script>

<style scoped>
</style>
