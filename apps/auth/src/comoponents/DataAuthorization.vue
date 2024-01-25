<template>
    <div class="dataAuthorization">
        <div>
            <strong>Access Needs: </strong>
            <a v-for="accessNeed in accessNeeds" :key="accessNeed" :href="accessNeed">
                {{ accessNeed }}
            </a>
        </div>
        <div>
            <strong>Grantees: </strong>
            <a v-for="grantee in grantees" :key="grantee" :href="grantee">
                {{ grantee }}
            </a>
        </div>
        <div>
            <strong>Authorized Data: </strong>
            <a v-for="shapeTree in registeredShapeTrees" :key="shapeTree" :href="shapeTree">
                {{ shapeTree }}
            </a>
        </div>
        <div>
            <strong>Scope: </strong>
            <a v-for="scope in scopes" :key="scope" :href="scope">
                {{ scope.split("#")[1] }}
            </a>
        </div>
        <div v-if="dataInstances.length > 0">
            <strong>Authorized Instances: </strong>
            <a v-for="dataInstance in dataInstances" :key="dataInstance" :href="dataInstance">
                {{ dataInstance }}
            </a>
        </div>
        <div>
            <strong>Access Mode: </strong>
            <a v-for="accessMode in accessModes" :key="accessMode" :href="accessMode">
                {{ accessMode.split("#")[1] }}
            </a>
        </div>
        <!-- <Button @click="grantDataAuthorization" type="button" style="margin: 20px" class="btn btn-primary"
            :disabled="associatedDataAuthorization !== ''">
            Authorize Need
        </Button> -->
    </div>
</template>

<script setup lang="ts">
import { useSolidSession } from "@shared/composables";
import {
    getResource,
    parseToN3,
    INTEROP,
} from "@shared/solid";
import { Store } from "n3";
import { useToast } from "primevue/usetoast";
import { computed, ref } from "vue";

const props = defineProps(["resourceURI", "redirect", "forSocialAgents", "dataAuthzContainer", "groupAuthorizationTrigger"]);
const emit = defineEmits(["createdDataAuthorization"])
const { authFetch, sessionInfo } = useSolidSession();
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


const accessModes = computed(() =>
    store.value.getObjects(props.resourceURI, INTEROP("accessMode"), null).map(t => t.value)
)
const registeredShapeTrees = computed(() =>
    store.value.getObjects(props.resourceURI, INTEROP("registeredShapeTree"), null).map(t => t.value)
)
const dataInstances = computed(() =>
    store.value.getObjects(props.resourceURI, INTEROP("hasDataInstance"), null).map(t => t.value)
)
const dataRegistrations = computed(() =>
    store.value.getObjects(props.resourceURI, INTEROP("hasDataRegistration"), null).map(t => t.value)
)
const grantees = computed(() =>
    store.value.getObjects(props.resourceURI, INTEROP('grantee'), null).map(t => t.value)
)
const scopes = computed(() =>
    store.value.getObjects(props.resourceURI, INTEROP('scopeOfAuthorization'), null).map(t => t.value)
)
const accessNeeds = computed(() =>
    store.value.getObjects(props.resourceURI, INTEROP('satisfiesAccessNeed'), null).map(t => t.value)
)
</script>