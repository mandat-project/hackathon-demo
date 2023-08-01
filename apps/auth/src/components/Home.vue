<template>
  <HeaderBar/>

  <!-- Create Demand -->
  <div class="grid">
    <div class="col lg:col-6">
      <div class="accordion" id="accessAccordion">
        <ul>
          <li style="list-style-type: none;margin-left: 30px;margin-right: 60px;margin-bottom: 5px" v-for="(accessRequest, accordionIndex) in accessRequests" :key="accessRequest">
            <div class="accordion-item">
              <h2 class="accordion-header">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" v-bind:data-bs-target="`#cv${accordionIndex}`"
                        aria-expanded="true" v-bind:aria-controls="`cv${accordionIndex}`">
                  <a :href=accessRequest.fromSocialAgentURI>{{ accessRequest.fromSocialAgent }}</a>
                  <a>&nbsp;{{ "requests " + accessRequest.accessNeedGroupDescriptionLabel }}</a>
                </button>
              </h2>
              <div v-bind:id="`cv${accordionIndex}`"   class="accordion-collapse collapse"
                   data-bs-parent="#accessAccordion" style="text-align:left">
                <div class="accordion-body" style="padding-top: 5px; padding-bottom: 5px">
                  <strong>Comment: </strong>{{accessRequest.accessNeedGroupDescriptionDefinition}}
                </div>
                <div class="accordion-body" style="padding-top: 5px; padding-bottom: 5px">
                  <strong>Required Data: </strong>
                  <a :href="accessRequest.shapeTreeURI">{{accessRequest.shapeTree }}</a>
                </div>
                <div class="accordion-body" style="padding-top: 5px; padding-bottom: 5px">
                  <strong>Access Mode: </strong>
                  <a :href="accessRequest.accessModeURI">{{ accessRequest.accessModeLabel }}</a>
                </div>
                <button @click="AuthorizeAndGrantAccess(accessRequest)" type="button" style="margin: 20px;" class="btn btn-primary">Authorize</button>
              </div>
            </div>
          </li>
        </ul>
      </div>
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
  SHAPETREE, RDFS, VCARD, getDataRegistrationContainers, putResource
} from "@shared/solid";
import {useSolidProfile, useSolidSession} from "@shared/composables";
import {HeaderBar} from "@shared/components";
import {ref, watch} from "vue";
import {useToast} from "primevue/usetoast";
import {QueryEngine} from "@comunica/query-sparql/lib/QueryEngine";

const {authFetch, sessionInfo} = useSolidSession();
const {storage} = useSolidProfile();
const toast = useToast();

const tax = ref("https://tax.solid.aifb.kit.edu/profile/card#me");
const accessRequests = ref<AccessRequest[]>([]);

watch(() => sessionInfo.isLoggedIn, (isLoggedIn) => isLoggedIn ? getAccessRequests() : {});

async function AuthorizeAndGrantAccess(accessRequest: AccessRequest) {
  const targetContainerURIs = await getDataRegistrationContainers(`${sessionInfo.webId}`, accessRequest.shapeTreeURI, authFetch.value);
  await postAccessAuthorization(accessRequest, targetContainerURIs);
  await postAccessControlList(accessRequest, targetContainerURIs);
}

async function postAccessAuthorization(accessRequest: AccessRequest, targetContainerURIs: string[]) {
  const date = new Date().toISOString();

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
      interop:grantedAt "${date}"^^xsd:dateTime ;
      interop:grantee <${accessRequest.fromSocialAgentURI}> ;
      interop:hasAccessNeedGroup <${accessRequest.accessNeedGroupURI}> ;
      interop:hasDataAuthorization <#bwaDataAuthorization> .

    <#bwaDataAuthorization>
      a interop:DataAuthorization ;
      interop:dataOwner <${accessRequest.fromSocialAgentURI}> ;
      interop:grantee  <${accessRequest.fromSocialAgentURI}> ;
      interop:registeredShapeTree <${accessRequest.shapeTreeURI}> ;
      interop:accessMode <${accessRequest.accessModeURI}> ;
      interop:scopeOfAuthorization interop:AllFromRegistry ;
      interop:hasDataRegistration  <${targetContainerURIs[0]}> ;
      interop:satisfiesAccessNeed <${accessRequest.accessNeedURI}> .`;

  await createResource(`${storage.value}authorization-registry/`, payload, authFetch.value)
    .then(() => toast.add({
      severity: "success",
      summary: "Access authorized",
      life: 5000
    }));
}

async function postAccessControlList(accessRequest: AccessRequest, targetContainerURIs: string[]) {

  const aclDataProcessed = `\
          @prefix acl: <${ACL()}>.

    <#owner>
        a           acl:Authorization;
        acl:agent   <${sessionInfo.webId}>;
        acl:mode    acl:Control,
                    acl:Read,
                    acl:Write;
        acl:accessTo <${targetContainerURIs[0]}>.

    <#bank>
        a acl:Authorization;
        acl:accessTo <${targetContainerURIs[0]}> ;
        acl:agent <${accessRequest.fromSocialAgentURI}>;
        acl:mode <${accessRequest.accessModeURI}>.

    <#tax>
        a               acl:Authorization;
        acl:accessTo    <${targetContainerURIs[0]}>;
        acl:agent       <${tax.value}>;
        acl:mode        acl:Read,
                        acl:Write.`;

  await putResource(targetContainerURIs[0] + ".acl", aclDataProcessed, authFetch.value);
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
  const storeProfileCard = await getResource(sessionInfo.webId!, authFetch.value)
    .then((resp) => resp.text())
    .then((txt) => parseToN3(txt, sessionInfo.webId!))
    .then((parsedN3) => parsedN3.store);
  const inboxURI = storeProfileCard.getObjects(null, INTEROP("hasAccessInbox"), null)[0].value;

  const inboxStore = await getResource(inboxURI, authFetch.value)
    .then((resp) => resp.text())
    .then((txt) => parseToN3(txt, inboxURI))
    .then((parsedN3) => parsedN3.store);

  const access_requests = inboxStore.getObjects(null, LDP('contains'), null);



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

         SELECT ?senderSocialAgent ?receiverSocialAgent   ?necessity ?shapeTree ?accessMode ?label ?definition ?accessModeLabel ?vcardName ?accessNeedGroup ?accessNeed WHERE  {
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
          accessRequests.value.push({
            fromSocialAgentURI: senderSocialAgent,
            fromSocialAgent: binding.get('vcardName').value,
            toSocialAgent: binding.get('receiverSocialAgent').value,
            accessNeedGroupDescriptionLabel: binding.get('label').value,
            accessNeedGroupDescriptionDefinition: binding.get('definition').value,
            necessity: binding.get('necessity').value,
            shapeTreeURI: binding.get('shapeTree').value,
            shapeTree: binding.get('shapeTree').value.split('#')[1],
            accessNeedGroupURI: binding.get('accessNeedGroup').value,
            accessModeLabel: binding.get('accessModeLabel').value,
            accessModeURI: binding.get('accessMode').value,
            accessNeedURI: binding.get('accessNeed').value
          })
          // Dummy access request to display more than one access request in the UI
          // Note: Invalid authorization. Can be overwritten by setting authorization for the bank
          //accessRequests.value.push({
          //  fromSocialAgentURI: "test",
          //  fromSocialAgent: "Steuerberater",
          //  toSocialAgent: binding.get('receiverSocialAgent').value,
          //  accessNeedGroupDescriptionLabel: "Schreibrechte BWA",
          //  accessNeedGroupDescriptionDefinition: "Steuerberater muss in deinen Container schreiben können, um die BWA bereitzustellen",
          //  necessity: binding.get('necessity').value,
          //  shapeTreeURI: binding.get('shapeTree').value,
          //  shapeTree: binding.get('shapeTree').value.split('#')[1],
          //  accessNeedGroupURI: binding.get('accessNeedGroup').value,
          //  accessModeLabel: "write",
          //  accessModeURI: binding.get('accessMode').value,
          //  accessNeedURI: binding.get('accessNeed').value
          //})
        });
      })
  })
}



interface AccessRequest {
  fromSocialAgentURI: string;
  fromSocialAgent: string;
  toSocialAgent: string;
  accessNeedGroupDescriptionLabel: string;
  accessNeedGroupDescriptionDefinition: string;
  necessity: string;
  shapeTree: string;
  shapeTreeURI: string;
  accessModeLabel: string;
  accessModeURI: string;
  accessNeedURI: string;
  accessNeedGroupURI: string;
}

</script>
