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
          <a :href=accessRequest.fromSocialAgentURI>{{ "From: " + accessRequest.fromSocialAgent }}</a>
          <p>{{ "Subject: " + accessRequest.label }}</p>
          <p>{{ "Comment: " + accessRequest.definition }}</p>
          <a :href="accessRequest.shapeTreeURI">{{ "Required Data: " + accessRequest.shapeTree }}</a>
          <p>
            <a :href="accessRequest.accessModeURI">{{ "Access Mode: " + accessRequest.accessMode }}</a>
          </p>
          <div class="col-12">
            <Button class="p-button-text p-button-rounded" icon="pi pi-arrow-right" label="Authorize and grant access"
                    @click="AuthorizeAndGrantAccess(accessRequest)"/>
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
  SHAPETREE, RDFS, VCARD, getDataRegistrationContainers, putResource, CREDIT, getLocationHeader
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

async function AuthorizeAndGrantAccess(accessRequest: AccessRequest) {
  await postAccessAuthorization(accessRequest);
  await postAccessControlList(accessRequest);
}

async function postAccessAuthorization(accessRequest: AccessRequest) {
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
      interop:grantee <${accessRequest.fromSocialAgentURI}> ;
      interop:hasAccessNeedGroup <#bwaAccessNeedGroup> ;
      interop:hasDataAuthorization <#bwaDataAuthorization> .

    <#bwaDataAuthorization>
      a interop:DataAuthorization ;
      interop:dataOwner <https://sme.solid.aifb.kit.edu/profile/card#me> ;
      interop:grantee  <${accessRequest.fromSocialAgentURI}> ;
      interop:registeredShapeTree shapeTree:businessAssessmentTree ;
      interop:accessMode acl:Read ;
      interop:scopeOfAuthorization interop:AllFromRegistry ;
      interop:hasDataRegistration  <https://sme.solid.aifb.kit.edu/businessAssessments/businessAssessment/> ;
      interop:satisfiesAccessNeed <#bwaAccessNeed> .`;

  // await createResource(`${storage.value}authorization-registry/`, payload, authFetch.value)
  //   .then(() => toast.add({
  //     severity: "success",
  //     summary: "Access authorized",
  //     life: 5000
  //   }));
}

async function postAccessControlList(accessRequest: AccessRequest) {
  const bank = ref("https://bank.solid.aifb.kit.edu/profile/card#me");
  const tax = ref("https://tax.solid.aifb.kit.edu/profile/card#me");


  const targetContainerUri = await getDataRegistrationContainers(`${sessionInfo.webId}`, accessRequest.shapeTreeURI, authFetch.value);

  // Intermediate Shortcut: Directly manipulating the ACL for the BWA data
  //<https://sme.solid.aifb.kit.edu/businessAssessments/.acl
  console.log(targetContainerUri);
  // create data-request resource ...
  const aclDataProcessed = `\
          @prefix acl: <${ACL()}>.

    <#owner>
        a           acl:Authorization;
        acl:agent   <${sessionInfo.webId}>;
        acl:mode    acl:Control,
                    acl:Read,
                    acl:Write;
        acl:accessTo <https://sme.solid.aifb.kit.edu/businessAssessments/businessAssessment/>.

    <#bank>
        a acl:Authorization;
        acl:accessTo <https://sme.solid.aifb.kit.edu/businessAssessments/businessAssessment/> ;
        acl:agent <${bank.value}>;
        acl:mode acl:Read.

    <#tax>
        a               acl:Authorization;
        acl:accessTo    <https://sme.solid.aifb.kit.edu/businessAssessments/businessAssessment/>;
        acl:agent       <${tax.value}>;
        acl:mode        acl:Read,
                        acl:Write.`;

  //targetContainerUri = ;
//'https://sme.solid.aifb.kit.edu/businessAssessments/'
  await putResource( targetContainerUri+ ".acl", aclDataProcessed, authFetch.value);
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
        const sparqlQuery = `
        PREFIX interop:<${INTEROP()}>
        PREFIX rdf:<${RDF()}>
        PREFIX rdfs:<${RDFS()}>
        PREFIX skos:<${SKOS()}>
        PREFIX acl:<${ACL()}>
        PREFIX vcard:<${VCARD()}>

         SELECT ?senderSocialAgent ?receiverSocialAgent   ?necessity ?shapeTree ?accessMode ?label ?definition ?accessModeLabel ?vcardName  WHERE  {
          ?accessRequest interop:fromSocialAgent    <${senderSocialAgent}> ;
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
         }`;
        const bindingsStream = await SparqlEngine.queryBindings(sparqlQuery, {
          sources: [store, ACL(), senderSocialAgent]
        });

        bindingsStream.on('data', (binding: any) => {
          // Obtaining values

          accessRequests.value.push({
            fromSocialAgentURI: senderSocialAgent,
            fromSocialAgent: binding.get('vcardName').value,
            toSocialAgent: binding.get('receiverSocialAgent').value,
            label: binding.get('label').value,
            definition: binding.get('definition').value,
            necessity: binding.get('necessity').value,
            shapeTreeURI: binding.get('shapeTree').value,
            shapeTree: binding.get('shapeTree').value.split('#')[1],
            accessMode: binding.get('accessModeLabel').value,
            accessModeURI: binding.get('accessMode').value
          })
        });
      })
  })
}


interface AccessRequest {
  fromSocialAgentURI: string;
  fromSocialAgent: string;
  toSocialAgent: string;
  label: string; // TODO change type to actual AccessNeedGroup
  definition: string;
  necessity: string;
  shapeTree: string;
  shapeTreeURI: string;
  accessMode: string;
  accessModeURI: string;
}

</script>
