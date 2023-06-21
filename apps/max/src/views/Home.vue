<script setup lang="ts">
import {useToast} from "primevue/usetoast";
import {ref, toRefs, watch} from "vue";
import {Quad, Store, NamedNode, Literal, Writer, Parser} from 'n3';
import { createResource, CREDIT, getResource, LDP, parseToN3, putResource, getLocationHeader, ACL, SCHEMA, FOAF, DCT, createContainer, patchResource } from "@shared/solid";
import { useSolidInbox, useSolidSession, useSolidProfile } from "@shared/composables";

const toast = useToast();
const {authFetch, sessionInfo} = useSolidSession();
const { isLoggedIn, webId } = toRefs(sessionInfo);
const isLoading = ref(false);
const {ldns} = useSolidInbox();
const { storage } = useSolidProfile()

const smeWebID = ref("https://sme.solid.aifb.kit.edu/profile/card#me");
const containerUri = ref("https://sme.solid.aifb.kit.edu/data-requests/");
const inboxUri = ref("https://sme.solid.aifb.kit.edu/inbox/");
const requests = ref(new Map<string, Store | null>());

const employeeForApprovalWebID = ref("https://max.solid.aifb.kit.edu/profile/card#me"); //fixed to Max's WebID for now

watch(
    () => ldns.value,
    () => isLoggedIn ? fetchRequests() : {}
);

function fetchRequests() {
  getResourceAsStore(containerUri.value).then(containerStore => getObjects(containerStore, LDP('contains'))
      .forEach(requestUri => {
        getResourceAsStore(requestUri).then(requestStore => {
          requests.value.set(requestUri, requestStore);
        })
      })
  );
}

async function processRequest(key: string) {
  const store = requests.value.get(key);
  if (store) {

    try{
      const targetUri = getObject(store, CREDIT('hasDataProcessed'));
      const processedDataBody = `@prefix ex: <${CREDIT()}>. <> a ex:ProcessedData .`;
      await putResource(targetUri, processedDataBody, authFetch.value);

      //LDN with targetUri as msgbody
      await createResource(inboxUri.value, "change happened at " + targetUri, authFetch.value);

      toast.add({
        severity: "success",
        summary: "Data was successfully processed! Resource changed at " + targetUri,
        life: 5000
      });
    }catch (err) {
      toast.add({
        severity: "error",
        summary: "Error during Data Processing",
        detail: err,
        life: 5000,
      });
    }
   
  }
}

/** starts the approval process for delegation of a resource */
async function startApprovalProcess(responsibleWebID: String[]) {

  var currentdate = new Date().toISOString().split('.')[0] + "Z"; // returns current date in ISO-Format (without millisec), e.g. 2022-11-25T01:30:00Z
  
  let approvalProcess =""
    
  if(responsibleWebID.length == 1){
    approvalProcess = `@prefix appro:   <https://www.example.org/approvalProcess#> .
  @prefix rdfs:    <http://www.w3.org/2000/01/rdf-schema#> .
  @prefix prov:    <http://www.w3.org/ns/prov#> .
  @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

  <> a appro:ApprovalProcess ;
    appro:approvalFlows ( <#SimpleFlow> ).

  <#SimpleFlow> a appro:AtomicFlow ;
    appro:hasStep ( <#SimpleStep> ).

  <#SimpleStep> a appro:IndividualApprovalStep ;
    appro:approvalOfIndividual <${responsibleWebID}> ;
    appro:hasActivity ( <#ApprovalActivity> ).

  <#ApprovalActivity> a prov:Activity ;
    prov:startedAtTime "${currentdate}"^^xsd:dateTime ; 
    prov:wasAssociatedWith <${responsibleWebID}> .`
  } else { //at the moment fixed for only two persons to sign...
    approvalProcess =  `@prefix appro:   <https://www.example.org/approvalProcess#> .
  @prefix rdfs:    <http://www.w3.org/2000/01/rdf-schema#> .
  @prefix prov:    <http://www.w3.org/ns/prov#> .
  @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

  <> a appro:ApprovalProcess ;
    appro:approvalFlows ( <#ParallelFlow> ) .

  <#ParallelFlow> a appro:AtomicFlow ;
    appro:hasParallelSteps ( <#SimpleStep1> <#SimpleStep2> ) .

  <#SimpleStep1> a appro:IndividualApprovalStep ;
    appro:approvalOfIndividual <${responsibleWebID[0]}> ;
    appro:hasActivity ( <#ApprovalActivity1> ).

  <#ApprovalActivity1> a prov:Activity ;
    prov:startedAtTime "${currentdate}"^^xsd:dateTime ; 
    prov:wasAssociatedWith <${responsibleWebID[0]}> .

  <#SimpleStep2> a appro:IndividualApprovalStep ;
    appro:approvalOfIndividual <${responsibleWebID[1]}> ;
    appro:hasActivity ( <#ApprovalActivity2> ).

  <#ApprovalActivity2> a prov:Activity ;
    prov:startedAtTime "${currentdate}"^^xsd:dateTime ; 
    prov:wasAssociatedWith <${responsibleWebID[1]}> .`

  }

 
    try {

      //@@@TODO - create container for this specific approval
      // Create approval resource container
      const createProcessContainer = await createContainer(storage.value + "templates/", "", authFetch.value);
      
      //get approval resource container URI
      const processContainer = getLocationHeader(createProcessContainer);

      // Create approval resource
      //const createProcess = await createResource(storage.value + "templates/", approvalProcess, authFetch.value);
      const createProcess = await createResource(processContainer, approvalProcess, authFetch.value);

      //get approval resource URI
      const process = getLocationHeader(createProcess);

      //set ACL with tax as owner and only responsible URIs as reader / poster
      const aclApprovalprocess = `\
        @prefix acl: <${ACL()}>.

        <#owner>
          a acl:Authorization;
          acl:accessTo <${process}> ;
          acl:agent <${webId?.value}> ;
          acl:mode acl:Control, acl:Read, acl:Write.
        <#responsible>
            a acl:Authorization;
            acl:accessTo <${process}> ;
            acl:agent <${idsToList(responsibleWebID)}> ;
            acl:mode acl:Read, acl:Append .
          `
      putResource(process + ".acl", aclApprovalprocess, authFetch.value);

      //set ACL for container with tax as owner and only responsible URIs as reader / poster
      const aclApprovalcontainer = `\
        @prefix acl: <${ACL()}>.

        <#owner>
          a acl:Authorization;
          acl:accessTo <${processContainer}> ;
          acl:agent <${webId?.value}> ;
          acl:mode acl:Control, acl:Read, acl:Write.
        <#defaultAcc>
          a acl:Authorization;
          acl:default <${processContainer}> ;
          acl:agent <${webId?.value}> ;
          acl:mode acl:Control, acl:Read, acl:Write.
        <#responsible>
            a acl:Authorization;
            acl:accessTo <${processContainer}> ;
            acl:agent <${idsToList(responsibleWebID)}> ;
            acl:mode acl:Read, acl:Append .
          `
      putResource(processContainer + ".acl", aclApprovalcontainer, authFetch.value);

    toast.add({
      severity: "success",
      summary: "Approval Process started.",
      life: 5000
    });

    return process; //return URI to process to link from Approval to Signature Process

  } catch (err) {
    toast.add({
      severity: "error",
      summary: "Error starting Approval Process",
      detail: err,
      life: 5000,
    });
  }

}

function whoIsBossOf(employeeWebID: string) : String[]{
  //@@@TODO: what to do if not found in Org structure?

  /* FANCY LOOKUP according to Organization Structure */
  if (employeeWebID == "https://max.solid.aifb.kit.edu/profile/card#me") {
    return ["https://schmid.solidcommunity.net/profile/card#me"]; //result of looking up boss
  } else if (employeeWebID == "https://mueller.solid.aifb.kit.edu/profile/card#me") {
    return ["https://www.example.com/profile#bigboss", "https://schmid.solidcommunity.net/profile/card#me"];
  } else {
    return ["https://www.example.com/profile#bigboss"];
  }

}

/**@@@ I use this to get the names from the associates / employees solid pods -
 *  i guess i could also use useSolidProfile() somehow but the documentation doesn't tell me how. replace if better option possible */
async function getSolidName(url :string) : String {
  
  let containerStore = new Store();
  let p = new Parser();

  const resp = await getResource(url, authFetch.value);
  const containerBody = await resp.text(); //get body
  const quads = p.parse(String(containerBody)); //stream to quads

  //add quads to store
  for (const quad of quads) {
    containerStore.add(quad);
  }
  var containers = [] //filter store for contained containers (well, only containers containing the processes should be in here, so I check only for the LDP-contains relation)
    
  for (const quad of containerStore.match(null, new NamedNode(FOAF('name')), null)) {
    containers.push(quad.object.value)
  } 
  console.log(containers[0]);
  
  return containers[0]
}


/** creates an approval for delegation for a given resource of a given associate to a given employee, on behalf of the tax accountant */
async function createApproval(resource: string, employeeWebID: string, associateWebID: string) {
        
  try {

    //Find out who is responsible for the given employeeWebID aka who has to sign
    //@@@TODO: should be also possible to generate approvals without required signatures? that is, skip the process creation?
    let responsibleWebID = whoIsBossOf(employeeWebID);

    //@@@TODO: check if responsible person was found, else error
    if (responsibleWebID.length == 0){
      throw new Error("Couldn't find responsible person..?");
    }

    //start process with resonsible person for required signature, returns URI of proccess ressource
    let resourceOfProcessForThisApproval = await startApprovalProcess(responsibleWebID);

    //GET names to fill in human readable form of stakeholders in approval process as rdfs:label
    var employeeName = await getSolidName(employeeWebID);
    var associateName = await getSolidName(associateWebID); 
    var dt = new Date();
    var processName = "CreditStuff-" + String(dt.getUTCHours() + '-' + dt.getUTCMinutes());
    
    
    const approvalDataBody =
      `@prefix appro: <https://www.example.org/approvalProcess#> . 
      @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> . 
      @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> . 
      <> a appro:Approval ; 
      appro:hasApprovalProcess <${resourceOfProcessForThisApproval}> ;
      appro:for <${resource}> ; 
      appro:actorOnBehalf <${employeeWebID}> ; 
      appro:actsOnBehalf <${webId?.value}> .`;

    // Create approval resource
    const createAppro = await createResource(storage.value + "approvals/", approvalDataBody, authFetch.value);
    
    //get approval resource URI
    const approval = getLocationHeader(createAppro);
    
    //set ACL with tax as owner and only SME (that is the business associate which gave the order to process data) as reader
    //@@@TODO: SME is granted read right atm, but should only get them AFTER approval is successfully finished.
    const aclApproval = `\
      @prefix acl: <${ACL()}>.

      <#owner>
        a acl:Authorization;
        acl:accessTo <${approval}> ;
        acl:agent <${webId?.value}> ;
        acl:mode acl:Control, acl:Read, acl:Write.
      <#sme>
          a acl:Authorization;
          acl:accessTo <${approval}> ;
          acl:agent <${associateWebID}> ;
          acl:mode acl:Read .
        `
    putResource(approval + ".acl", aclApproval, authFetch.value);

    //PATCH relation of approval process to approval and name of approval 
    var bod1 = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
    @prefix appro:   <https://www.example.org/approvalProcess#> .

    _:rename a solid:InsertDeletePatch;
    solid:where   { ?pro a appro:ApprovalProcess .};
    solid:inserts { ?pro appro:isApprovalProcessFor <${approval}> . }.`
      
    await patchResource(String(resourceOfProcessForThisApproval), String(bod1), authFetch.value);

    var bod2 = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
    @prefix appro:   <https://www.example.org/approvalProcess#> .
    @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
    _:rename a solid:InsertDeletePatch;
    solid:where   { ?pro a appro:ApprovalProcess .};
    solid:inserts { ?pro rdfs:label "Approve ${employeeName} to work on ${processName} for ${associateName}" . }.`
      
    await patchResource(String(resourceOfProcessForThisApproval), String(bod2), authFetch.value);

    toast.add({
      severity: "success",
      summary: "Approval created.",
      life: 5000
    });
  } catch (err) {
    toast.add({
      severity: "error",
      summary: "Error creating Approval",
      detail: err,
      life: 5000,
    });
  }
  
}

// HELPER-FUNCTIONS

function getResourceAsStore(uri: string): Promise<any> {
  isLoading.value = true;
  return getResource(uri, authFetch.value)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on fetch!",
          detail: err,
          life: 5000,
        });
        isLoading.value = false;
        throw new Error(err);
      })
      .then((resp) => resp.text())
      .then(txt => parseToN3(txt, uri))
      .then(n3 => n3.store)
      .finally(() => {
        isLoading.value = false;
      });
}

function getObjects(store: Store, quad1: string, quad2?: Quad) {
  const subjectUri = store.getSubjects(null, null, null)[0].value;
  return store.getObjects(subjectUri, quad1, quad2 || null).map(obj => obj.value);
}

function getObject(store: Store, quad1: string, quad2?: Quad): string {
  return getObjects(store, quad1, quad2)[0];
}

function idsToList(webIds : String[]) : String{
  let r = ""
  for(let i = 0; i < webIds.length; i++){
    r += webIds[i];
    if(i < webIds.length-1)
    { r+=">, <" }
  }
  return r;
}
</script>

<template>
  <Toolbar v-if="isLoggedIn">
    <template  #start>
      <router-link to="/">
        <Button>Home</Button>
      </router-link>
      <router-link to="/processes/">
        <Button >Processes</Button>
      </router-link>
    </template>
  </Toolbar>
  
  
  <div class="grid">
    <div class="col lg:col-6 lg:col-offset-3">
      <div class="p-inputgroup">
        <InputText
            placeholder="GET my request."
            v-model="containerUri"
            @keyup.enter="fetchRequests(containerUri)"
        />
        <Button @click="fetchRequests(containerUri)"> GET</Button>
      </div>

      <div class="progressbarWrapper">
        <ProgressBar v-if="isLoading" mode="indeterminate"/>
      </div>
    </div>
  </div>

  <div class="grid">
    <div class="col lg:col-6 lg:col-offset-3">
      <ul v-if="isLoggedIn">
        <li v-for="([uri, store], index) of requests" :key="index">
          <p>Request #{{ index }}: {{ uri }}</p>
          <!--<p>Date : {{ getObject(store, DCT('modified')) }} </p>-->
          <p>Target-Uri: {{ getObject(store, CREDIT('hasDataProcessed')) }}</p>
          <p>Requested Data : {{ getObject(store, CREDIT('hasRequestedData')) }} </p>
          <Button @click="processRequest(uri)">Do Processing</Button>
          <p>
            Employee: <InputText placeholder="WebID of Employee to get approved..." v-model="employeeForApprovalWebID" /> 
            Associate: <InputText placeholder="WebID of Associate to read approval..." v-model="smeWebID" /> 
            <Button @click="createApproval(uri, employeeForApprovalWebID, smeWebID)">Delegate</Button>
          </p>
        </li>
      </ul>
      <span v-else> 401 Unauthenticated : Login using the button in the top-right corner! </span>
    </div>
  </div>
</template>

<style scoped>
.grid {
  margin: 5px;
}

.p-inputgroup {
  padding-bottom: 0;
}

.border {
  border: 1px solid var(--surface-d);
  border-radius: 3px;
}

.border:hover {
  border: 1px solid var(--primary-color);
}

.progressbarWrapper {
  height: 2px;
  padding: 0 9px 0 9px;
  transform: translate(0, -1px);
}

.p-progressbar {
  height: 2px;
  padding-top: 0;
  border-top-right-radius: 0;
  border-top-left-radius: 0;
}
</style>