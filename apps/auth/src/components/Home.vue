<template>
  <HeaderBar/>

  <!-- Create Demand -->
  <div class="grid">
    <div class="col lg:col-6 lg:col-offset-3">

      <h1>Create Demand</h1>

      <div class="col-12">
        <Button class="p-button-text p-button-rounded" icon="pi pi-arrow-left" label="Zurück"
                @click="getAccessRequests()"/>
      </div>

      <ul>
        <li v-for="accessRequest in accessRequests" :key="accessRequest">
          <p>{{ accessRequest.fromSocialAgent }}</p>
          <p>{{ accessRequest.toSocialAgent }}</p>
          <p>{{ accessRequest.hasAccessNeedGroup }}</p>
          <div class="col-12">
            <Button class="p-button-text p-button-rounded" icon="pi pi-arrow-left" label="grant"
                    @click="postAccessAuthorization()"/>
          </div>
        </li>
      </ul>

    </div>
  </div>


</template>

<script lang="ts" setup>
import {createResource, getResource, INTEROP, LDP, parseToN3} from "@shared/solid";
import {useSolidProfile, useSolidSession} from "@shared/composables";
import {HeaderBar} from "@shared/components";
import {ref} from "vue";
import {useToast} from "primevue/usetoast";

const {authFetch, sessionInfo} = useSolidSession();
const {storage} = useSolidProfile();
const toast = useToast();

const accessRequestURI = "https://sme.solid.aifb.kit.edu/access-inbox/";
const accessRequests = ref<AccessRequest[]>([]);

async function postAccessAuthorization() {
  const payload = `
    @prefix interop: <http://www.w3.org/ns/solid/interop#> .
    @prefix ldp: <http://www.w3.org/ns/ldp#> .
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
    @prefix acl: <http://www.w3.org/ns/auth/acl#> .
    @prefix shapeTree:  <https://solid.aifb.kit.edu/shapes/mandat/businessAssessment.tree#>.

    # Located in the Authorization Registry of SME
    <#bwaAccessAuthorization>
      a interop:AccessAuthorization ;
      interop:grantedBy <${sessionInfo.webId}> ;
      interop:grantedWith <#blank> ;
      interop:grantedAt "2020-09-05T06:15:01Z"^^xsd:dateTime ;
      interop:grantee <https://bank.solid.aifb.kit.edu/profile/card#me> ;
      interop:hasAccessNeedGroup <#bwaAccessNeedGroup> ;
      interop:hasDataAuthorization <#bwaDataAuthorization> .

    <#bwaDataAuthorization>
      a interop:DataAuthorization ;
      interop:dataOwner <https://sme.solid.aifb.kit.edu/profile/card#me> ;
      interop:grantee <https://bank.solid.aifb.kit.edu/profile/card#me> ;
      interop:registeredShapeTree shapeTree:businessAssessmentTree ;
      interop:accessMode acl:Read ;
      interop:scopeOfAuthorization interop:AllFromRegistry ;
      interop:hasDataRegistration  <https://sme.solid.aifb.kit.edu/businessAssessments/businessAssessment/> ;
      interop:satisfiesAccessNeed <#bwaAccessNeed> .`;

  await createResource(`${storage.value}authorization-registry/`, payload, authFetch.value)
    .then(() => toast.add({severity: "success", summary: "Access Granted"}));

}

async function getAccessRequests() {
  console.log(storage.value);

  const store = await getResource(accessRequestURI, authFetch.value)
    .then((resp) => resp.text())
    .then((txt) => parseToN3(txt, accessRequestURI))
    .then((parsedN3) => parsedN3.store);

  const access_requests = store.getObjects(null, LDP('contains'), null);

  console.log(store);
  console.log(access_requests);

  access_requests.forEach(request => {
    getResource(request.id, authFetch.value)
      .then((resp) => resp.text())
      .then((txt) => parseToN3(txt, accessRequestURI))
      .then((parsedN3) => parsedN3.store)
      .then(store => {
        const fromSocialAgent = store.getObjects(null, INTEROP('fromSocialAgent'), null)[0].value;
        const toSocialAgent = store.getObjects(null, INTEROP('toSocialAgent'), null)[0].value;
        const hasAccessNeedGroup = store.getObjects(null, INTEROP('hasAccessNeedGroup'), null)[0].value;

        accessRequests.value.push({fromSocialAgent, toSocialAgent, hasAccessNeedGroup})
      })
  })
}

//interop:fromSocialAgent <https://bank.solid.aifb.kit.edu/profile/card#me> ;
//interop:toSocialAgent  <https://sme.solid.aifb.kit.edu/profile/card#me> ;
//interop:hasAccessNeedGroup <#bwaAccessNeedGroup> .

interface AccessRequest {
  fromSocialAgent: string;
  toSocialAgent: string;
  hasAccessNeedGroup: string; // TODO change type to actual AccessNeedGroup

}

</script>

