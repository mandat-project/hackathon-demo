<script setup lang="ts">
import { useToast } from "primevue/usetoast";
import { ref, toRefs, watch, onUpdated } from "vue";
import { Quad, Store, NamedNode, Literal, Writer, Parser } from 'n3';
import { createResource, CREDIT, getResource, LDP, parseToN3, putResource, getLocationHeader, ACL, SCHEMA, postResource, patchResource, createContainer, deleteResource, RDF, RDFS, WILD } from "@shared/solid";
import { useSolidInbox, useSolidSession, useSolidProfile } from "@shared/composables";
import { DataFactory } from "n3";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import ProgressBar from "primevue/progressbar";
import Toolbar from "primevue/toolbar";
import { RouterLink } from "vue-router";
import { register } from 'register-service-worker';
import { ParsedN3, getContainerItems } from '../../../../libs/solid/src/solidRequests';

const toast = useToast();
const { authFetch, sessionInfo } = useSolidSession();
const { isLoggedIn, webId } = toRefs(sessionInfo);
const isLoading = ref(false);
const { ldns } = useSolidInbox();
const { storage } = useSolidProfile()

//@@@TODO: to be removed, when FROG is added to namespaces.ts
function Namespace(namespace: string) {
  return (thing?: string) => thing ? namespace.concat(thing) : namespace;
}

//@@@TODO: to be added to namespaces.ts
const FROG = Namespace("https://solid.ti.rw.fau.de/public/ns/frog#")
const PROV = Namespace("http://www.w3.org/ns/prov#")
const ORG = Namespace("http://www.w3.org/ns/org#")

const containerUri = ref("https://tax.solid.aifb.kit.edu/memberships/"); //container where open membership processes are stored
const organizationUri = ref("https://tax.solid.aifb.kit.edu/organization/"); //location where the organization hierarchy is stored
const policyUri = ref("https://tax.solid.aifb.kit.edu/policies"); //location where the organization's policies are stored


const requests = ref(new Map<string, Store | null>()); //requested memberships URI and store
const requestsContainer = new Map<String, String>();//container containing requested memberships

var requiredRole = ref(new Map<string, string>()) //tie membership application and roles together

var userRole = ref<String[]>([]) //save webIDs roles according to organization and memberships

let applyForNewMembership = ref("") //selected new membership to apply for

watch(
  () => ldns.value,
  () => isLoggedIn ? fetchProcesses() : {}
);

/*Fetch all processes that are located in containerURI */
async function fetchProcesses() {

  isLoading.value = true;
  getUserRoles()
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

    var containers = [] //filter store for contained containers (well, only container containing the membership processes should be in here, so I check only for the LDP-contains relation)

    for (const quad of containerStore.match(null, new NamedNode(LDP('contains')), null)) {
      containers.push(quad.object.value)
    }
    // for each container: get content and extract the approval process document as store

    let processURIs = [];

    for (const cont of containers) {

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
          } catch (error) {
            //ignore all resources that may not be accessed
          }

          const p = st.match(null, new NamedNode(RDF('type')), new NamedNode(WILD('WorkflowInstance'))) //get all workflow instances...
          //get quads p and gather subjects in array. sigh.

          //for each workflow instance
          for (const k of p) {
            //put together uri of WFI
            let completeUriofProcess = containerUri.value + cont + resourceInContainer + k['subject'].value

            /**crawl related WorkflowModels and activities and add to store  */

            let workflowModels = st.getObjects(k['subject'].value, new NamedNode(WILD('workflowInstanceOf')), null) //get workflowmodel

            for (const wfm of workflowModels) {
              let wfmResp = await getResource(wfm.value, authFetch.value); //get WFM 
              const quadswfm = p1.parse(String(await wfmResp.text()))
              for (const quad of quadswfm) {
                st.add(quad); //add all WFM info to store
              }

              let activites = st.getObjects(wfm, new NamedNode(WILD('hasBehaviour')), null) //get activites, @@@TODO: get all activities that might be also in composite activities...

              for (const act of activites) {
                let actResp = await getResource(act.value, authFetch.value); //get activity representation
                const quadsact = p1.parse(String(await actResp.text()))
                for (const qu of quadsact) {
                  st.add(qu); //add all activites info to store
                }
                requiredRole.value.set(completeUriofProcess, st.getObjects(act, FROG("needsRole"), null)[0].value) //relation to containing container of approval process
              }

            }

            processURIs.push(String(completeUriofProcess))
            requestsContainer.set(String(completeUriofProcess), containerUri.value + cont) //relation to containing container of approval process


          }

        }

      } catch (error) {

      }
    }

    //finally, get all contained approval processes, and save their store in a map with their uri as key
    for (const uri of processURIs) {
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

        for (const actInstance of st.getSubjects(RDF("type"), WILD("ActivityInstance"), null)) {
          //get all activity instances for this WorkflowInstance
          for (const actModel of st.getObjects(actInstance, WILD("activityInstanceOf"), null)) {
            //get all activities related to the activity instances
            let actResp = await getResource(actModel.value, authFetch.value); //get activity "model" representation
            const quadsact = p1.parse(String(await actResp.text()))
            for (const qu of quadsact) {
              st.add(qu); //add all activity models to store which includes the necessary FROG:roles for signing
            }
          }
        }
        requests.value.set(uri, st)
      } catch (error) {

      }
    }
  } catch (error) {
    isLoading.value = false;
    console.log(error)
  }

  isLoading.value = false;
}

async function giveSignature(membershipProcess: string, requestApproved: boolean) {

  const store = requests.value.get(membershipProcess);

  //signature of respective webId
  let signatureStr = `"I, ${webId?.value}, hereby sign!"`

  if (store) {
    //Gather all activities my roles may sign...
    let activitiyInstances = []

    for (const actInstance of store.getSubjects(RDF("type"), WILD("ActivityInstance"), null)) {
      //get all activity instances for this WorkflowInstance
      for (const actModel of store.getObjects(actInstance, WILD("activityInstanceOf"), null)) {
        //get all activity related to the activity instances
        for (const role of store.getObjects(actModel, FROG("needsRole"), null)) {
          //get all roles realted to the activites
          //if the required role is one of my roles, add it to the activites I may sign
          if (userRole.value.includes(role.value)) {
            activitiyInstances.push(actInstance.value)
          }

        }

      }
    }

    var currentdate = new Date().toISOString().split('.')[0] + "Z"; // returns current date in ISO-Format (without millisec), e.g. 2023-11-25T01:30:00Z

    try {
      for (const activitiyInstance of activitiyInstances) {
        var sigBody = ""

        if (requestApproved) {//approved request contains prov:Activity and prov:Entity with signature
          sigBody = `
          @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
          @prefix prov: <http://www.w3.org/ns/prov#>.
          @prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
    
          <> a prov:Activity ;
          prov:wasAssociatedWith <${webId?.value}> ;
          prov:startedAtTime "${currentdate}"^^xsd:dateTime ;
          prov:endedAtTime "${currentdate}"^^xsd:dateTime ;
          prov:generated <#signature1> .
    
          <#signature1> a prov:Entity;
          prov:wasGeneratedBy <#provActivity1> ;
          prov:wasAttributedTo <${webId?.value}> ;
          prov:wasGeneratedAtTime "${currentdate}"^^xsd:dateTime;
          prov:value ${signatureStr} .`

        } else {//denied request contains only prov:Activity
          sigBody = `
          @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
          @prefix prov: <http://www.w3.org/ns/prov#>.
          @prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
    
          <> a prov:Activity ;
          prov:wasAssociatedWith <${webId?.value}> ;
          prov:startedAtTime "${currentdate}"^^xsd:dateTime ;
          prov:endedAtTime "${currentdate}"^^xsd:dateTime . `
        }

        // Create signature resource
        const createSignature = await createResource(String(requestsContainer.get(membershipProcess)), sigBody, authFetch.value);

        //get approval resource URI
        const signatureUri = getLocationHeader(createSignature);

        //patch existing activity
        var bod = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
          @prefix frog: <https://solid.ti.rw.fau.de/public/ns/frog#> .
          @prefix wild: 	 <http://purl.org/wild/vocab#> .
          @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> . 

          _:rename a solid:InsertDeletePatch;
            solid:where   { <${activitiyInstance}> rdf:type wild:ActivityInstance .};
            solid:inserts { <${activitiyInstance}> frog:activity <${signatureUri}> . }.`

        await patchResource(membershipProcess, String(bod), authFetch.value);
      }

      toast.add({
        severity: "success",
        summary: (requestApproved) ? "Signature for request created." : "Denial for request created.",
        life: 5000
      });

      fetchProcesses() //fetch processes again for page update

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

/** look up and return all roles in hierarchy or via membership of current user's webID 
 */
async function getUserRoles(): Promise<void> {

  userRole.value = [] //reset

  var posts = []
  let postsStore = new Store();
  let p = new Parser();

  const resp = await getResource(organizationUri.value, authFetch.value); //get organizaton
  const orgBody = await resp.text(); //get body
  const quads = p.parse(String(orgBody)); //stream to quads

  //add quads to store
  for (const quad of quads) {
    postsStore.add(quad);
  }

  var resource = [] //filter store for contained containers (well, only containers containing the processes should be in here, so I check only for the LDP-contains relation)

  for (const quad of postsStore.match(null, new NamedNode(LDP('contains')), null)) {

    resource.push(organizationUri.value + quad.object.value)

    let resp = await getResource(organizationUri.value + quad.object.value, authFetch.value); //get departments
    let respBody = await resp.text();
    for (const q of p.parse(String(respBody))) {
      postsStore.add(q)
    }

  }

  //get all POSTS that are held by the webID
  for (const post of postsStore.getSubjects(new NamedNode(ORG('heldBy')), new NamedNode(String(webId?.value)), null)) {
    posts.push(post.value)
    userRole.value.push(postsStore.getObjects(post, new NamedNode(ORG('role')), null)[0].value) //save associated role
  }

  //crawl all memberships and get all memberships that have frog:state frog:approved (@@@ materialized by reasoning of delegationProxy..?), then add these roles
  let membershipStore = new Store();
  let containers = await getContainerItems(containerUri.value, authFetch.value) //get single membership containers
  let allMemberships = Array<string>();

  //add quads to store
  for (const con of containers) {
    (await getContainerItems(con, authFetch.value)).forEach((element) => {
      allMemberships.push(element);
    });
  }

  for (const member of allMemberships) {
    const resp = await getResource(member, authFetch.value); //get organizaton
    const memberBody = await resp.text(); //get body
    const memberQuads = p.parse(String(memberBody)); //stream to quads
    //add quads to store
    for (const quad of memberQuads) {
      membershipStore.add(quad);
    }
  }

  for (const myMemberships of membershipStore.getObjects(new NamedNode(webId!.value!), ORG("hasMembership"), null)) {
    for (const relatedWorkflowInstance of membershipStore.getObjects(myMemberships, FROG("hasWorkflowInstance"), null)) {
      if (membershipStore.has(new Quad(relatedWorkflowInstance, new NamedNode(FROG("status")), new NamedNode(FROG("approved"))))) 
      {
        //we use FROG("approved") to indicate a done+approved membership workflow instance to grant a role
        userRole.value.push(membershipStore.getObjects(myMemberships, new NamedNode(ORG('role')), null)[0].value) 
      }
    }
  }
}


/** webID may apply for a role in the organization that is selected via applyForNewMembership.value. Creates a workflow instance according to the defined related policy. */
async function applyForRole() {
  try {
    var appliedRole = ""

    //Fancy lookup for role URI
    switch (applyForNewMembership.value) {
      case "procurator":
        appliedRole = "https://tax.solid.aifb.kit.edu/organization/holzwurm#procuratorRole"
        break;
      case "CEO":
        appliedRole = "https://tax.solid.aifb.kit.edu/organization/holzwurm#ceoRole"
        break;
      case "depleader":
      appliedRole = "https://tax.solid.aifb.kit.edu/organization/engineering#engineeringDepartmentLeaderRole"
      break;
      case "none":
      default:
        throw new Error("No role selected");
    }

    var currentdate = new Date().toISOString().split('.')[0] + "Z"; // returns current date in ISO-Format (without millisec), e.g. 2023-11-25T01:30:00Z

    //look up which policy belongs to the role to get the related workflowModel
    let policyStore = new Store();
    let p1 = new Parser()
    let policyResponse = await getResource(policyUri.value, authFetch.value);
    const quadsPolicy = p1.parse(String(await policyResponse.text()))
    for (const quad of quadsPolicy) {
      policyStore.add(quad);
    }

    let policy = policyStore.getSubjects(FROG("role"), appliedRole, null)[0]; //get policy for applied role
    let wfm = policyStore.getObjects(policy, FROG("workflowModel"), null)[0]; //get WorkflowModel for policy
    const quadsWfm = p1.parse(String(await (await getResource(wfm.value, authFetch.value)).text())) //get WorkflowModel
    for (const quad of quadsWfm) {
      policyStore.add(quad);
    }
    let activities = new Array<string>()
    
    policyStore.getObjects(wfm, WILD("hasBehaviour"), null).forEach((quad) => {activities.push(quad.value)}) //get root activity  
    
    let rootAct = activities[0]; //the WFI's hasBehaviour activity is always the first activity we get and thus root, according to WILD
    
    //we assume that all activites are in one place
    const quadsActivity = p1.parse(String(await (await getResource(activities[0], authFetch.value)).text()))
    for (const quad of quadsActivity) {
      policyStore.add(quad); 
    }

    //gathers all activities beside root activity
            //    let act_uris = getActivityTree(activities[0].value, policyStore)
    getActivityTree(rootAct, policyStore).forEach((val) => {activities.push(val)})

    //set root activity to wild:active; set all other activity instances to wild:initialised
    let activityBody = "";
    let runningNumber = 0;
    for (const activity of activities) {
      activityBody += `
        <#${String(runningNumber)}> a wild:ActivityInstance ;
        wild:inWorkflowInstance <#workflow-instance> ;
        wild:hasState ${(activity == rootAct)? "wild:active" : "wild:initialised" } ;
        wild:activityInstanceOf <${activity}> .  `

      runningNumber++;
    }

    let templateBody = `@prefix org: <http://www.w3.org/ns/org#> .
      @prefix time: <http://www.w3.org/2006/time#> .
      @prefix frog: <https://solid.ti.rw.fau.de/public/ns/frog#> .
      @prefix wild: <http://purl.org/wild/vocab#> .
      @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
      
      <${webId?.value}> org:hasMembership [
        a org:Membership ;
          org:role <${appliedRole}> ;
          org:memberDuring [
            time:hasBeginning "${currentdate}"^^xsd:dateTime 
          ] ;
          frog:hasWorkflowInstance <#workflow-instance>
        ] .

      <#workflow-instance> a wild:WorkflowInstance ;
        wild:hasState wild:initialised ;
        wild:workflowInstanceOf <${wfm.value}> .`

    templateBody += activityBody; //concat for all gathered activity instances

    const newMembershipContainerResponse = await createContainer(containerUri.value, "", authFetch.value) //create container
    const newMembershipContainer = getLocationHeader(newMembershipContainerResponse);
    const newMembershipResponse = await createResource(newMembershipContainer, templateBody, authFetch.value);
    const newMembership = getLocationHeader(newMembershipResponse);

    //ACL stuff??

    toast.add({
      severity: "success",
      summary: `You applied for ${appliedRole}.`,
      life: 5000
    });


  } catch (error) {
    toast.add({
      severity: "error",
      summary: "Error during role application creation.",
      detail: error,
      life: 5000,
    });
  }
}

// HELPER-FUNCTIONS

function getActivityTree(act : string, store : Store) : Array<string>
{
  console.log("getTree called on" + act)
  let uris = Array<string>()
  
  //get "regular" wild:Activity objs
  for(const cA of store.getObjects(new NamedNode(act), WILD("hasChildActivity"), null)) 
  {
    uris.push(cA.value)
  } 
  
  //extract elements from list, add to children 
  let listBN = store.getObjects(new NamedNode(act), WILD("hasChildActivities"), null)[0] //returns rdf:List whose elements are activities
  if(listBN)
  { 
    const lists = store.extractLists({ remove: false }); //get all lists in store
    for(const childActivity of lists[listBN.value]) //get the list associated with our activity
    {
      uris.push(childActivity.value)
    }
  }

  if(uris.length == 0) //no children found, nothing two check
  {
    return [];

  } else{ //this action had children, check if there are further children

    let results = Array<string>()

    for(const child of uris)
    {
      getActivityTree(child, store).forEach((val) => {results.push(val)})
    }

    results.forEach((val)=>{uris.push(val)})
  }

  return uris;
}

/**Generates a string description for a given Membership approval */
function getDescription(store: Store): string {
  //WebID of applicant
  let applicant = (store.getSubjects(ORG("hasMembership"), null, null))[0].value

  //beantragt rolle
  let requestedMembership = (store.getSubjects(RDF("type"), ORG("Membership"), null))[0]
  let role = store.getObjects(requestedMembership, new NamedNode(ORG("role")), null)[0].value

  //@@@TODO: apply for some defined time interval 
  //let timeStart = store.match(null, null, null)
  //let timeEnd = store.match(null, null, null)
  return `${applicant} applies for ${role}`

}

function getObjects(store: Store, quad1: string, quad2?: Quad) {
  const subjectUri = store.getSubjects(null, null, null)[0].value;
  return store.getObjects(subjectUri, quad1, quad2 || null).map(obj => obj.value);
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
function checkAlreadySigned(store: Store, membershipProcess: string): Boolean {
  //Gather all activities that could have been signed by my roles 
  let activitiyInstances = []

  if (store) {
    //I really wish I could just somehow write a SPARQL query with N3.js ...
    for (const actInstance of store.getSubjects(RDF("type"), WILD("ActivityInstance"), null)) {
      //get all activity instances for this WorkflowInstance

      for (const actModel of store.getObjects(actInstance, WILD("activityInstanceOf"), null)) {
        //get all activity related to the activity instances
        for (const role of store.getObjects(actModel, FROG("needsRole"), null)) {
          //get all roles realted to the activites
          //if the required role is one of my roles, add it to the activites I may sign
          if (userRole.value.includes(role.value)) {
            activitiyInstances.push(actInstance)
          }
        }
      }
    }

    let countProcessedActivites = 0; //to count the activity instances that have a PROV:activity related to them via the FROG:activity predicate (indicates that the activity was already processed)

    for (let act of activitiyInstances) {
      for (let qd of store!.getObjects(act, FROG('activity'), null)) {
        countProcessedActivites++;
      }
    }

    //if as many signed activities exist as the user may sign with their roles, they cannot sign anything anymore
    if (activitiyInstances.length == countProcessedActivites) {
      return true //all prov:Activities were generated, so the process is done (independent of "denied" or "approved"); 
    } else {
      return false //some prov:Activities might be missing for my role...
    }
  } else { //no store??
    return false;
  }
}

/*returns an array of strings of all objects for a given predicate*/
function getObjString(store: Store, predicate: string) {

  let objectArray = []
  for (const quad of store.match(null, new NamedNode(predicate), null)) {
    objectArray.push(String(quad.object.value))
  }
  return objectArray
}    

</script>
  
<template>
  <div class="grid">
    <div class="col lg:col-6 lg:col-offset-3">
      <div class="p-inputgroup">
        <InputText placeholder="GET all my current processes." v-model=containerUri @keyup.enter="fetchProcesses()" />
        <Button @click="fetchProcesses()"> GET approval processes </Button>
      </div>
      <div>
        <router-link to="/">
          <Button>Return to requests</Button>
        </router-link>
      </div>
      <ProgressBar v-if="isLoading" mode="indeterminate" class="progressbar" />

    </div>
  </div>
  <div v-if="isLoggedIn" class="grid">
    <div class="col lg:col-6 lg:col-offset-3">
      <div class="p-inputgroup">

        Apply for role membership:
        <select v-model="applyForNewMembership">
          <option value="none" selected> </option>
          <option value="procurator">Procurator</option>
          <option value="CEO">CEO</option>
          <option value="depleader">Department leader</option>
        </select>
        <Button @click="applyForRole()"> Submit application </Button>
      </div>
    </div>
  </div>

  <div class="grid">
    <div class="col lg:col-6 lg:col-offset-3">
      <ul v-if="isLoggedIn">
        <p v-if="requests == undefined">
          Nothing to sign - yet. Refresh?
          <Button icon="pi pi-refresh" class="p-button-text p-button-rounded p-button-icon-only"
            @click="fetchProcesses()"></Button>
        </p>
        <!-- @@@ if requests is empty display "nothing to sign"-->
        <li v-for="([uri, store], index) of requests" :key="index">

          <p>Process #{{ index }}: {{ uri.replace(containerUri, '') }}</p>
          <p>{{ getDescription(store!) }}</p>

          {{ requiredRole.get(uri) }} required.<br>
          Your roles are {{ userRole }}.

          <div v-if="requiredRole.get(uri) != '' && userRole.length > 0">
            <div v-if="userRole.includes(requiredRole.get(uri)!) == true && (checkAlreadySigned(store!, uri) == false)">
              <Button @click="giveSignature(uri, true)">Approve ✅️</Button>
              <Button @click="giveSignature(uri, false)">Deny ❌️</Button>
            </div>
            <div v-else-if="userRole.includes(requiredRole.get(uri)!) == true && checkAlreadySigned(store!, uri) == true">
              <Button :disabled="true">Nothing to sign for your roles ✒️ </Button>
            </div>
            <div v-else>
              <Button :disabled="true">You cannot sign this process 🚫️ </Button>
            </div>

          </div>
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