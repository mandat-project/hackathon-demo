<template>
  <HeaderBar/>

  <!-- Create Demand -->
  <div class="grid">
    <div class="col lg:col-6 lg:col-offset-3">

      <h1>Check for Access Requests</h1>

      <div class="col-12">
        <Button class="p-button-text p-button-rounded" icon="pi pi-arrow-right" label="Check For Access Requests"
                @click="getAccessRequests()"/>
      </div>

      <ul>
        <li style="list-style-type: none;" v-for="(accessRequest,index) in accessRequests" :key="accessRequest">
          <p>{{ "Request " + (index + 1) + ":" }}</p>
          <p>{{ "From: " + accessRequest.fromSocialAgent }}</p>
          <p>{{ "Subject: " + accessRequest.label }}</p>
          <p>{{ "Comment: " + accessRequest.definition }}</p>
          <p>{{ "Required Data: " + accessRequest.shapeTree }}</p>
          <p>{{ "Access Mode: " + accessRequest.accessMode }}</p>
          <div class="col-12">
            <Button class="p-button-text p-button-rounded" icon="pi pi-arrow-right" label="Authorize and grant access"
                    @click="AuthorizeAndGrantAccess()"/>
          </div>
        </li>
      </ul>

    </div>
  </div>


</template>

<script lang="ts" setup>
import {
  createResource,
  getResource,
  INTEROP,
  LDP,
  SKOS,
  parseToN3,
  RDF,
  XSD,
  ACL,
  SHAPETREE, RDFS, VCARD
} from "@shared/solid";
import {useSolidProfile, useSolidSession} from "@shared/composables";
import {HeaderBar} from "@shared/components";
import {ref} from "vue";
import {useToast} from "primevue/usetoast";
import {QueryEngine} from "@comunica/query-sparql/lib/QueryEngine";

const {authFetch, sessionInfo} = useSolidSession();
const {storage} = useSolidProfile();
const toast = useToast();

const inboxURI = "https://sme.solid.aifb.kit.edu/access-inbox/";
const accessRequests = ref<AccessRequest[]>([]);

async function AuthorizeAndGrantAccess() {
  await postAccessAuthorization();
  await postAccessGrantInAgentRegistry();
}

async function postAccessAuthorization() {
  const payload = `
    @prefix interop:<${INTEROP()}> .
    @prefix ldp:<${LDP()}> .
    @prefix xsd:<${XSD()}> .
    @prefix acl:<${ACL()}> .
    @prefix shapeTree:<${SHAPETREE()}> .

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
    .then(() => toast.add({
      severity: "success",
      summary: "Access authorized",
      life: 5000
    }));
}

async function postAccessGrantInAgentRegistry() {
  const payload = `
      @prefix interop:<${INTEROP()}> .
      @prefix ldp:<${LDP()}> .
      @prefix xsd:<${XSD()}> .
      @prefix acl:<${ACL()}> .
      @prefix shapeTree:<${SHAPETREE()}> .

     # Located in the Agent Registry of SME, readable by Bank
      <#bwaAccessGrant>
      a interop:AccessGrant ;
      interop:grantedBy <${sessionInfo.webId}> ;
      interop:grantedAt "2020-04-04T20:15:47.000Z"^^xsd:dateTime ;
      interop:grantee <https://bank.solid.aifb.kit.edu/profile/card#me> ;
      interop:hasAccessNeedGroup <#bwaAccessNeedGroup> ;
      interop:hasDataGrant <#bwaDataGrant> .

      <#bwaDataGrant>
      a interop:DataGrant ;
      # Take care: DataOwner is not necessarialy the one who grants: 'grantedBy!
      interop:dataOwner <${sessionInfo.webId}> ;
      interop:grantee <https://bank.solid.aifb.kit.edu/profile/card#me> ;
      interop:registeredShapeTree shapeTree:businessAssessmentTree ;
      interop:hasDataRegistration <https://sme.solid.aifb.kit.edu/businessAssessments/businessAssessment/> ;
      interop:satisfiesAccessNeed <#bwaAccessNeed> ;
      interop:accessMode acl:Read ;
      interop:scopeOfGrant interop:AllFromRegistry .`;

  await createResource(`${storage.value}agent-registry/`, payload, authFetch.value)
    .then(() => toast.add({
      severity: "success",
      summary: "Access granted",
      life: 5000
    }));
}

async function postAccessReceiptToGrantee() {
  const payload = `
    @prefix interop:<${INTEROP()}> .
    @prefix ldp:<${LDP()}> .
    @prefix xsd:<${XSD()}> .
    @prefix acl:<${ACL()}> .
    @prefix shapeTree:<${SHAPETREE()}> .

 # Send to the access inbox of Bank by SME
<#bwaAccessReceipt>
  a interop:AccessReceipt ;
  interop:providedAt "2020-09-05T06:15:01Z"^^xsd:dateTime ;
  interop:grantedBy <${sessionInfo.webId}> .`;

  await createResource(`${storage.value}agent-registry/`, payload, authFetch.value)
    .then(() => toast.add({severity: "success", summary: "AccessReceipt sent to grantee"}));
}

async function getAccessRequests() {
  const store = await getResource(inboxURI, authFetch.value)
    .then((resp) => resp.text())
    .then((txt) => parseToN3(txt, inboxURI))
    .then((parsedN3) => parsedN3.store);

  const access_requests = store.getObjects(null, LDP('contains'), null);

  access_requests.forEach(request => {
    getResource(request.id, authFetch.value)
      .then((resp) => resp.text())
      .then((txt) => parseToN3(txt, inboxURI))
      .then((parsedN3) => parsedN3.store)
      .then(async store => {
        const senderSocialAgent = store.getObjects(null, INTEROP("fromSocialAgent"), null)[0].value;
        const SparqlEngine = new QueryEngine();
        const bindingsStream = await SparqlEngine.queryBindings(`
        PREFIX interop:<${INTEROP()}>
        PREFIX rdf:<${RDF()}>
        PREFIX rdfs:<${RDFS()}>
        PREFIX skos:<${SKOS()}>
        PREFIX acl:<${ACL()}>
        PREFIX vcard:<${VCARD()}>

         SELECT ?senderSocialAgent ?receiverSocialAgent   ?necessity ?shapeTree ?accessMode ?label ?definition ?accessModeLabel ?vcardName  WHERE  {
          ?accessRequest interop:fromSocialAgent    ?senderSocialAgent ;
                         interop:toSocialAgent      ?receiverSocialAgent ;
                         interop:hasAccessNeedGroup ?accessNeedGroup.

          ?accessNeedGroupDescription interop:hasAccessNeedGroup  ?accessNeedGroup;
                                      a interop:AccessNeedGroupDescription ;
                                      skos:prefLabel              ?label;
                                      skos:definition             ?definition;
                                      interop:hasAccessNeedGroup  ?accessNeedGroup.

          ?accessNeedGroup   a                        interop:AccessNeedGroup;
                             interop:hasAccessNeed    ?accessNeed.

          ?accessNeed a                             interop:AccessNeed.
          ?accessNeed interop:accessMode            ?accessMode.
          ?accessNeed interop:registeredShapeTree   ?shapeTree.
          ?accessNeed interop:accessNecessity       ?necessity.

         ?accessMode rdfs:label ?accessModeLabel.

         ?senderSocialAgent  vcard:fn ?vcardName.
         }`, {
          sources: [store, 'http://www.w3.org/ns/auth/acl#', senderSocialAgent]
        });

        bindingsStream.on('data', (binding: any) => {
          // Obtaining values

          accessRequests.value.push({
            fromSocialAgent: binding.get('vcardName').value,
            toSocialAgent: binding.get('receiverSocialAgent').value,
            label: binding.get('label').value,
            definition: binding.get('definition').value,
            necessity: binding.get('necessity').value,
            shapeTree: binding.get('shapeTree').value,
            accessMode: binding.get('accessModeLabel').value
          })
        });
      })
  })
}


interface AccessRequest {
  fromSocialAgent: string;
  toSocialAgent: string;
  label: string; // TODO change type to actual AccessNeedGroup
  definition: string;
  necessity: string;
  shapeTree: string;
  accessMode: string;
}

</script>
