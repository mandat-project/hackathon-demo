<template>
    <div class="accessAuthorization">
        <div>
            <strong>Grant date: </strong>
            <div v-for="date in grantDates" :key="date">
                {{ date }}
            </div>
        </div>
        <div>
            <strong>Grantees: </strong>
            <a v-for="grantee in grantees" :key="grantee" :href="grantee">
                {{ grantee }}
            </a>
        </div>
        <div>
            <strong>Access Need Groups: </strong>
            <a v-for="accessNeedGroup in accessNeedGroups" :key="accessNeedGroup" :href="accessNeedGroup">
                {{ accessNeedGroup }}
            </a>
        </div>
        <div class="p-card" style="margin: 5px">
            <div>
                <strong>Data Authorizations</strong>
            </div>
            <!-- <Button @click="grantAccessAuthorization" type="button" class="btn btn-primary mb-2"
                :disabled="associatedAccessAuthorization !== ''">
                Authorize Group
            </Button> -->
            <div v-for="dataAuthorization in dataAuthorizations" :key="dataAuthorization"
                class="p-card col-12 lg:col-8 lg:col-offset-2" style="margin: 5px">
                <Suspense>
                    <DataAuthorization :resourceURI="dataAuthorization" />
                    <template #fallback>
                        <span>
                            Loading {{ dataAuthorization.split("/")[dataAuthorization.split("/").length - 1] }}
                        </span>
                    </template>
                </Suspense>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import DataAuthorization from "../comoponents/DataAuthorization.vue";
import { useSolidSession } from "@shared/composables";
import {
    getResource,
    parseToN3,
    INTEROP,
} from "@shared/solid";
import { Store } from "n3";
import { useToast } from "primevue/usetoast";
import { computed, ref } from "vue";

const props = defineProps(["resourceURI", "redirect", "forSocialAgents", "accessAuthzContainer", "dataAuthzContainer", "requestAuthorizationTrigger"]);
const emit = defineEmits(["createdAccessAuthorization"])
const { authFetch } = useSolidSession();
const toast = useToast();

const store = ref(new Store());
store.value = await getResource(props.resourceURI, authFetch.value)
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
    .then((txt) => parseToN3(txt, props.resourceURI))
    .then((parsedN3) => (store.value = parsedN3.store));

const grantDates = computed(() => store.value.getObjects(props.resourceURI, INTEROP('grantedAt'), null).map(t => t.value))
const grantees = computed(() => store.value.getObjects(props.resourceURI, INTEROP('grantee'), null).map(t => t.value))
const accessNeedGroups = computed(() => store.value.getObjects(props.resourceURI, INTEROP('hasAccessNeedGroup'), null).map(t => t.value))
const dataAuthorizations = computed(() => store.value.getObjects(props.resourceURI, INTEROP('hasDataAuthorization'), null).map(t => t.value))
</script>