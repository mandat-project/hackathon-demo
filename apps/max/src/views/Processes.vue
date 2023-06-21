<script setup lang="ts">
import {useToast} from "primevue/usetoast";
import {ref, toRefs, watch} from "vue";
import {Quad, Store, NamedNode, Literal, Writer, Parser} from 'n3';
import { createResource,  CREDIT, getResource, LDP, parseToN3, putResource, getLocationHeader, ACL, SCHEMA, postResource, patchResource, createContainer, deleteResource, RDF, RDFS } from "@shared/solid";
import { useSolidInbox, useSolidSession, useSolidProfile } from "@shared/composables";
import { DataFactory } from "n3";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import ProgressBar from "primevue/progressbar";
import Toolbar from "primevue/toolbar";
import { RouterLink } from "vue-router";
import { register } from 'register-service-worker';

const toast = useToast();
const {authFetch, sessionInfo} = useSolidSession();
const { isLoggedIn, webId } = toRefs(sessionInfo);
const isLoading = ref(false);
const {ldns} = useSolidInbox();
const { storage } = useSolidProfile()

//@@@TODO: to be removed, when APPRO is added to namespaces.ts
function Namespace(namespace: string) {
  return (thing?: string) => thing ? namespace.concat(thing) : namespace;
}

//@@@TODO: to be added to mamespaces.ts
const APPRO = Namespace("https://www.example.org/approvalProcess#") 
const PROV = Namespace("http://www.w3.org/ns/prov#") 

const containerUri = ref("https://tax.solid.aifb.kit.edu/templates/"); //location where open processes are stored, name TBD


const requests = ref(new Map<string, Store | null>()); //process resource and store
const requestsContainer = new Map<String, String>();//process resource and the container containing process resource


watch(
    () => ldns.value,
    () => isLoggedIn ? fetchProcesses() : {}
);

/*Fetch all processes that are located in containerURI */
async function fetchProcesses() {

  //get Container that contains all approval containers
  let containerStore = new Store();
  let p = new Parser();

  try {

    const resp = await getResource(containerUri.value, authFetch.value);
    const containerBody = await resp.text(); //get body

    const quads = p.parse(String(containerBody)); //stream to quads

    //add quads to store
    for (const quad of quads) {
      containerStore.add(quad);
    }

    var containers = [] //filter store for contained containers (well, only containers containing the processes should be in here, so I check only for the LDP-contains relation)
    
    for (const quad of containerStore.match(null, new NamedNode(LDP('contains')), null)) {
      containers.push(quad.object.value)
    }  
    // for each container: get content and extract the approval process document as store

    let processURIs = [];

    for(const cont of containers){
    
      try {
        let st = new Store();
        let res = await getResource(containerUri.value + cont, authFetch.value);
        const resBody = await res.text(); //get body
        let p1 = new Parser();
        const quads = p1.parse(String(resBody)); //stream to quads

        //add quad to store
        for (const quad of quads) {
          st.add(quad);
        }

        for (const resourceInContainer of getObjects(st, LDP('contains'))) {
          
          try {
            let resInC = await getResource(containerUri.value + cont + resourceInContainer, authFetch.value);
            const resInCBody = await resInC.text(); //get body
            const quadsC = p1.parse(String(resInCBody))

            for (const quad of quadsC) {
              st.add(quad);
            }
          } catch (error){
            //ignore all resources that may not be accessed
          }
        }

        const p = st.match(null, new NamedNode(RDF('type')), new NamedNode(APPRO('ApprovalProcess')))
        //get quads p and gather subjects in array. sigh.
        for(const k of p)
        {
          processURIs.push(String(k['subject'].value))
          requestsContainer.set(String(k['subject'].value), containerUri.value + cont) //relation to containing container of approval process
        }
        
        
      } catch (error) {
        
      }    
    }

    //finally, get all contained approval processes, and save their store in a map with their uri as key
    for(const uri of processURIs)
    {
      try {
        let st = new Store();
        let res = await getResource(uri, authFetch.value);
        const resBody = await res.text(); //get body
        let p1 = new Parser();
        const quads = p1.parse(String(resBody)); //stream to quads

        //add quad to store
        for (const quad of quads) {
          st.add(quad);
        }

        requests.value.set(uri, st)
      } catch (error) {
        
      }
    }
  } catch (error) {
    console.log(error)
  }
}

async function giveSignature(key: string) {

  //@@@TODO: only return steps that have OngoingStatus - already finished steps shall not be considered
  const store = requests.value.get(key);

  //@@@TODO: signature of respective webId
  let signatureStr = `"signature of ${webId?.value}"`

  if (store ) {
    
    var currentdate = new Date().toISOString().split('.')[0] + "Z"; // returns current date in ISO-Format (without millisec), e.g. 2022-11-25T01:30:00Z

    let myActivites = [] //gathers all occurring activities

    //get all associated activities for my webId in this store 
    for (const quad of store.match(null, new NamedNode(PROV('wasAssociatedWith')), new NamedNode(`${webId?.value}`))) {
      myActivites.push(quad.subject.value);
    }  
    try {

      for (const act of myActivites) {
      
        const sigBody = `
        @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
        @prefix prov: <http://www.w3.org/ns/prov#>.
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
        
        <> a prov:Entity;
        prov:wasGeneratedBy <${key+act}>;
        prov:wasAttributedTo <${webId?.value}>;
        prov:wasGeneratedAtTime "${currentdate}"^^xsd:dateTime;
        prov:value ${signatureStr}.`
      
      
        // Create signature resource
        const createSignature = await createResource(String(requestsContainer.get(key)), sigBody, authFetch.value);

        //get approval resource URI
        const signatureUri = getLocationHeader(createSignature);

        //patch existing activity
        var bod = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
          @prefix prov:   <http://www.w3.org/ns/prov#> .

          _:rename a solid:InsertDeletePatch;
            solid:where   { ?pro prov:wasAssociatedWith <${webId?.value}> .};
            solid:inserts { ?pro prov:generated <${signatureUri}> . }.`

        const resp = await patchResource(key, String(bod), authFetch.value); 
      
      }

  
      toast.add({
        severity: "success",
        summary: "Gave signature to activity.",
        life: 5000
      });

      fetchProcesses() //just gets all processes again such that the signature count is updated

   } catch (err) {
      toast.add({
        severity: "error",
        summary: "Error giving signature.",
        detail: err,
        life: 5000,
      });
    }


  }  
}

function getStatus(store: Store): string {
  const uris = store.match(null, new NamedNode(RDF('type')), new NamedNode(APPRO('ApprovalProcess')))
  
  /*there MUST be exactly one thing of type approvalProcess and its subject is the URI of the Process, so I imagine somthing like the line below (=just take first quad's subject and that's the uri. But that isn't working, so we do a 'for loop' for exactly on triple...)
  let processURI = uris[0].subject.value;
  */
  let processURI = ""
  for(const c of uris)
  {
    processURI = c.subject.value;
  }

  const p = store.match(new NamedNode(processURI) , new NamedNode(RDF('type')), null ) //get all associated types to the process
  let types = [];
  for(const quad of p){
    types.push(quad.object.value);
  }
  
  if (types.includes("https://www.example.org/approvalProcess#ApprovedProcess")){
    return "Approved"
  } else if (types.includes("https://www.example.org/approvalProcess#DeniedProcess")){
    return "Denied"
  } else {
    return "Ongoing"
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

/*returns an array of strings of all URIs that are indicated via the sigPred predicate to be responsible to sign*/
function getSignatures(store: Store, sigPred: string) {
    
  let sigArr = [];
  //collects all listed entities that are associated with the activity
  for (const quad of store.match(null, new NamedNode(sigPred), null)){
    sigArr.push(quad.object.value);
  }  
  return sigArr; 
}

/*count responsible persons to sign*/
function countSignatures(store: Store, sigPred: string) {
  return getSignatures(store,sigPred).length;
}

/*counts how many signature are already present in total (all users)*/
function checkSignatures(store: Store) {

  //collect all generated entities for this process  
  let st = new Store();
  for (const quad of store.match(null, new NamedNode(PROV('generated')), null)) {
    st.add(quad);
  }
  //collect all entites that point to rdf:nil (= no signature / decision created)
  const p = st.match(null, new NamedNode(PROV('generated')), new NamedNode(RDF('nil')))
  
  return st.size - p.size; //difference gives already made decisions
}

/*checks if a process was already signed by a given WebID*/
async function checkAlreadySigned(uri : string, store: Store, webID : string) {

    let activities = [];
    //collects all listed activities that are associated with the webID that has to sign
    for (const quad of store.match(null, PROV('wasAssociatedWith'), new NamedNode(`${webID}`))){
      activities.push(quad.subject);
    }  
    let st = new Store();
    let res = await getResource(uri + activities[0].value, authFetch.value); //get the whole activity resource
    const resBody = await res.text(); //get body
    let p1 = new Parser();
    const quads = p1.parse(String(resBody)); //stream to quads
    //add quad to store
    for (const quad of quads) {
      st.add(quad);
    }

    //prov:generated is only in the activity, iff a resource was created (independent of approved or denied), so webID should be able to sign anymore
    if ((st.countQuads(null, PROV('generated'), null)) == 0) {
      return false //nothing generated
    } else {
      return true //something generated; @@@ better check here..?
    }
}

/*returns an array of strings of all URIs that this Approval Process links to (aka that are approved by the signatures)*/
function getObjString(store: Store, processPred: string) {

  let pA = []
  for (const quad of store.match(null, new NamedNode(processPred), null)) {
    pA.push(String(quad.object.value))
  }

  return pA //returns all ressources that this Approval Process links to
}

</script>

<template>
  <Toolbar v-if="isLoggedIn">
    <template #start>
      <router-link to="/">
        <Button>Home</Button>
      </router-link>
      <router-link to="/processes/">
        <Button>Processes</Button>
      </router-link>
    </template>
  </Toolbar>

  <div class="grid">
    <div class="col lg:col-6 lg:col-offset-3">
      <div class="p-inputgroup">
        <InputText placeholder="GET all my current processes." v-model=containerUri  @keyup.enter="fetchProcesses()" />
        <Button @click="fetchProcesses()"> GET approval processes </Button>
      </div>
  
      <div class="progressbarWrapper">
        <ProgressBar v-if="isLoading" mode="indeterminate" />
      </div>
    </div>
  </div>
  
  <div class="grid">
    <div class="col lg:col-6 lg:col-offset-3">
      <ul v-if="isLoggedIn">
          <!-- @@@ if requests is empty display "nothing to sign"-->
        
        <li v-for="([uri, store], index) of requests" :key="index">
          <p>Process #{{ index }}: </p>
          <p>Process to be approved: {{ getObjString(store, RDFS("label"))[0] }}</p>
          
          <!--@@@ checkAlready signed returns wrong state..?
            <div v-if="checkAlreadySigned(uri, store, webId)">
                true -> is signed
            </div>
            <div v-if="checkAlreadySigned(uri, store, webId) == false">
                false -> is not signed
            </div>-->

          <div v-if="getStatus(store) === 'Ongoing'">
            <!--Activity state: Ongoing ⏩️-->
            <!--@@@ prevent signing of document, if already signed? without using status-->
            <Button @click="giveSignature(uri)" v-if="(getSignatures(store, PROV('wasAssociatedWith')).includes(webId)) ">Give your signature ✒️</Button>
          </div>
          <div v-else-if="getStatus(store) === 'Approved'">
            <!--Activity state: Approved ✅️-->
            <Button :disabled="true" v-if="(getStatus(store) === 'Approved')">This process was already approved ✅️</Button>
          
          </div>
          <div v-else-if="getStatus(store) === 'Denied'">
            <!--Activity state: Denied ❌️-->
            <Button :disabled="true" v-if="(getStatus(store) === 'Denied')">This process was already denied ❌️</Button>
          
          </div>
          <div v-else>
            Activity status not available ❓️
          </div>
          
          <p>{{ checkSignatures(store) }} of {{ countSignatures(store, PROV('wasAssociatedWith')) }} total have already signed</p>
          
          <Button :disabled=true v-if="!(getSignatures(store, PROV('wasAssociatedWith')).includes(webId))">You may not sign 🚫️</Button>
          
          <hr>
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