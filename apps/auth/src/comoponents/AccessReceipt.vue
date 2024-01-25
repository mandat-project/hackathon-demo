<template>
    <div class="accessReceipt">
        <Card>
            <template #content>
                <!-- <div class="accessRequest" v-for="request in requests" :key="request"> -->
                <div>
                    <strong>Provided At: </strong>
                    <span v-for="date in provisionDates" :key="date">
                        {{ date }}
                    </span>
                </div>
                <div>
                    <strong>For Access Request: </strong>
                    <a v-for="accessRequest in accessRequests" :key="accessRequest" :href="accessRequest">
                        {{ accessRequest }}
                    </a>
                </div>
                <div class="p-card" style="margin: 5px">
                    <div>
                        <strong>Access Authoriztions</strong>
                    </div>
                    <!-- <Button @click="grantAccessReceipt" type="button" class="btn btn-primary mb-2"
                        :disabled="associatedAccessReceipt !== ''">
                        Authorize Request
                    </Button> -->
                    <div v-for="accessAuthorization in accessAuthorizations" :key="accessAuthorization"
                        class="p-card  col-12 lg:col-8 lg:col-offset-2" style="margin: 5px">
                        <Suspense>
                            <AccessAuthorization :resourceURI="accessAuthorization" />
                            <template #fallback>
                                <span>
                                    Loading {{ accessAuthorization.split("/")[accessAuthorization.split("/").length - 1] }}
                                </span>
                            </template>
                        </Suspense>
                    </div>
                </div>
            </template>
        </Card>
    </div>
</template>
  
<script setup lang="ts">
import AccessAuthorization from "../comoponents/AccessAuthorization.vue";
import { useSolidSession } from "@shared/composables";
import {
    getResource,
    parseToN3,
    RDF,
    INTEROP,
    AUTH,
} from "@shared/solid";
import { Store } from "n3";
import { useToast } from "primevue/usetoast";
import { computed, ref, watch } from "vue";

const props = defineProps(["informationResourceURI"]);
const emit = defineEmits(["isReceiptForRequests"])
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

// const receipt = store.value.getSubjects(RDF("type"), INTEROP("AccessReceipt"), null).map(t => t.value)
const accessReceipt = store.value.getSubjects(RDF("type"), INTEROP("AccessReceipt"), null).map(t => t.value)[0]

const provisionDates = computed(() => store.value.getObjects(accessReceipt, INTEROP("providedAt"), null).map(t => t.value))
const accessRequests = computed(() => store.value.getObjects(accessReceipt, AUTH("hasAccessRequest"), null).map(t => t.value))
const accessAuthorizations = computed(() => store.value.getObjects(accessReceipt, INTEROP("hasAccessAuthorization"), null).map(t => t.value))

watch(() => accessRequests.value,
    () => {
        if (accessRequests.value.length > 0) {
            emit("isReceiptForRequests", accessRequests.value)
        }
    }, { immediate: true })
</script>