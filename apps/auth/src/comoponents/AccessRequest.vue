<template>
  <div class="accessRequests">
    <Card>
      <template #content>
        <!-- <div class="accessRequest" v-for="request in requests" :key="request"> -->
        <div>
          <strong>Purpose: </strong>
          <span v-for="label in purposes" :key="label">
            {{ label }}
          </span>
        </div>
        <div>
          <strong>To: </strong>
          <a v-for="recipient in toSocialAgents" :key="recipient" :href="recipient">
            {{ recipient }}
          </a>
        </div>
        <div>
          <strong>From: </strong>
          <a v-for="sender in fromSocialAgents" :key="sender" :href="sender">
            {{ sender }}
          </a>
        </div>
        <div>
          <strong>For: </strong>
          <a v-for="grantee in forSocialAgents" :key="grantee" :href="grantee">
            {{ grantee }}
          </a>
        </div>
        <div>
          <strong>From Demand: </strong>
          <a v-for="demand in fromDemands" :key="demand" :href="demand">
            {{ demand }}
          </a>
        </div>
        <div class="p-card" style="margin: 5px">
          <div>
            <strong>Access Need Groups</strong>
          </div>
          <div>
            <Button @click="grantAccessReceipt" type="button" class="btn btn-primary mb-2"
              :disabled="associatedAccessReceipt !== '' || accessAuthorizationTrigger">
              Authorize Request
            </Button>
            <!-- TODO Decline -->
          </div>
          <div v-for="accessNeedGroup in accessNeedGroups" :key="accessNeedGroup"
            class="p-card  col-12 lg:col-8 lg:col-offset-2" style="margin: 5px">
            <Suspense>
              <AccessNeedGroup :resourceURI="accessNeedGroup" :forSocialAgents="forSocialAgents"
                :accessAuthzContainer="accessAuthzContainer" :dataAuthzContainer="dataAuthzContainer"
                :requestAuthorizationTrigger="accessAuthorizationTrigger"
                @createdAccessAuthorization="addToDataAuthorizations" />
              <template #fallback>
                <span>
                  Loading {{ accessNeedGroup.split("/")[accessNeedGroup.split("/").length - 1] }}
                </span>
              </template>
            </Suspense>
          </div>
        </div>
        <!-- </div> -->
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import AccessNeedGroup from "../comoponents/AccessNeedGroup.vue";
import { useSolidSession } from "@shared/composables";
import {
  getResource,
  parseToN3,
  RDF,
  INTEROP,
  XSD,
  GDPRP,
  createResource,
  CREDIT,
  AUTH, getLocationHeader,
} from "@shared/solid";
import { Store } from "n3";
import { useToast } from "primevue/usetoast";
import { computed, reactive, ref } from "vue";

const props = defineProps(["informationResourceURI", "redirect", "dataAuthzContainer", "accessAuthzContainer", "accessReceiptContainer"]);
const emit = defineEmits(["createdAccessReceipt"])
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

// const requests = store.value.getSubjects(RDF("type"), INTEROP("AccessRequest"), null).map(t => t.value)
const accessRequest = store.value.getSubjects(RDF("type"), INTEROP("AccessRequest"), null).map(t => t.value)[0]

const purposes = computed(() => store.value.getObjects(accessRequest, GDPRP('purposeForProcessing'), null).map(t => t.value))
const toSocialAgents = computed(() => store.value.getObjects(accessRequest, INTEROP("toSocialAgent"), null).map(t => t.value))
const fromSocialAgents = computed(() => store.value.getObjects(accessRequest, INTEROP("fromSocialAgent"), null).map(t => t.value))
const forSocialAgents = computed(() => {
  const forSocialAgentsDirect = store.value.getObjects(accessRequest, INTEROP("forSocialAgent"), null).map(t => t.value)
  if (forSocialAgentsDirect.length > 0) {
    return forSocialAgentsDirect
  }
  return fromSocialAgents.value
})
const fromDemands = computed(() => store.value.getObjects(accessRequest, CREDIT("fromDemand"), null).map(t => t.value))
const accessNeedGroups = computed(() => store.value.getObjects(accessRequest, INTEROP("hasAccessNeedGroup"), null).map(t => t.value))


// 
// 
// 

const accessReceiptLocalName = "accessReceipt"

const associatedAccessReceipt = ref("")

const accessAuthorizations = reactive(new Map());
const accessAuthorizationTrigger = ref(false)
function addToDataAuthorizations(accessNeedGroup: string, accessAuthorization: string) {
  accessAuthorizations.set(accessNeedGroup, accessAuthorization)
}

async function grantAccessReceipt() {
  // trigger access grants
  accessAuthorizationTrigger.value = true
  // wait until all events fired
  while (accessAuthorizations.size !== accessNeedGroups.value.length) {
    console.log("Waiting for access receipt ...");
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  // trigger access authorization
  const accessReceiptLocation = createAccessReceipt(
    [...accessAuthorizations.values()]
  )
  // emit to overview
  associatedAccessReceipt.value = (await accessReceiptLocation) + "#" + accessReceiptLocalName
  emit("createdAccessReceipt", props.informationResourceURI, associatedAccessReceipt.value)
  // redirect if wanted
  if (props.redirect) {
    window.open(
      `${props.redirect}?uri=${encodeURIComponent(
        accessRequest
      )}&result=1`,
      "_self"
    );
  }
}

async function createAccessReceipt(
  accessAuthorizations: string[]
) {
  const date = new Date().toISOString();
  const payload = `
    @prefix interop:<${INTEROP()}> .
    @prefix xsd:<${XSD()}> .
    @prefix auth:<${AUTH()}> .

    <#${accessReceiptLocalName}>
      a interop:AccessReceipt ;
      interop:providedAt "${date}"^^xsd:dateTime ;
      auth:hasAccessRequest <${accessRequest}> ;
      interop:hasAccessAuthorization ${accessAuthorizations
      .map((t) => "<" + t + ">")
      .join(", ")} .
`;
  return createResource(props.accessReceiptContainer, payload, authFetch.value)
    .then((loc) => {
      toast.add({
        severity: "success",
        summary: "Access Receipt created.",
        life: 5000,
      })
      return getLocationHeader(loc)
    }
    )
    .catch((err) => {
      toast.add({
        severity: "error",
        summary: "Failed to create Access Receipt!",
        detail: err,
        life: 5000,
      });
      throw new Error(err);
    })

}

































/*
async function declineAndDontGrantAccess(accessRequest: AccessRequest) {
  // find registries
  for (const accessNeedGroup of accessRequest.hasAccessNeedGroup) {
    for (const accessNeed of accessNeedGroup.hasAccessNeed) {
      for (const shapeTree of accessNeed.registeredShapeTree) {
        const dataInstances = [] as string[];
        dataInstances.push(...accessNeed.hasDataInstance); // potentially manually edited (added/removed) in auth agent
        await createDeniedAccessAuthorization(
          accessRequest,
          accessNeedGroup,
          accessNeed,
        );
      }
    }
  }
  
  getAuthorization(accessRequest)
    .then(authorization => { associatedAuthorization.value = authorization })
}

async function authorizeAndGrantAccess(accessRequest: AccessRequest) {
  // find registries
  for (const accessNeedGroup of accessRequest.hasAccessNeedGroup) {
    for (const accessNeed of accessNeedGroup.hasAccessNeed) {
      for (const shapeTree of accessNeed.registeredShapeTree) {
        const dataRegistrations = await getDataRegistrationContainers(
          `${sessionInfo.webId}`,
          shapeTree,
          authFetch.value
        ).catch((err) => {
          toast.add({
            severity: "error",
            summary: "Error on getDataRegistrationContainers!",
            detail: err,
            life: 5000,
          });
          throw new Error(err);
        });
        const dataInstances = [] as string[];
        dataInstances.push(...accessNeed.hasDataInstance); // potentially manually edited (added/removed) in auth agent
        await createGrantedAccessAuthorization(
          accessRequest,
          accessNeedGroup,
          accessNeed,
          dataRegistrations,
          dataInstances
        );
        const accessToResources =
          dataInstances.length > 0 ? dataInstances : dataRegistrations;
        // only grant specific resource access
        for (const resource of accessToResources) {
          await updateAccessControlList(
            resource,
            accessRequest.fromSocialAgent,
            accessNeed.accessMode
          );
        }
      }
    }
  }
  await setDemandIsAccessRequestGranted(accessRequest.fromDemand[0]); // naja, wenn da jemand mehr reinschreib, wirds komisch.
  if (props.redirect) {
    window.open(
      `${props.redirect}?uri=${encodeURIComponent(
        accessRequest.uri
      )}&result=1`,
      "_self"
    );
  }
  getAuthorization(accessRequest)
    .then(authorization => { associatedAuthorization.value = authorization })
}

async function createDeniedAccessAuthorization(
  accessRequest: AccessRequest,
  accessNeedGroup: AccessNeedGroup,
  accessNeed: AccessNeed
) {
  const date = new Date().toISOString();
  const payload = `
    @prefix interop:<${INTEROP()}> .
    @prefix ldp:<${LDP()}> .
    @prefix xsd:<${XSD()}> .
    @prefix acl:<${ACL()}> .
    @prefix auth:<${AUTH()}> .
    

    <#accessAuthorization>
      a interop:AccessAuthorization ;
      auth:hasAccessRequest <${accessRequest.uri}> ;
      interop:grantedBy <${sessionInfo.webId}> ;
      interop:grantedAt "${date}"^^xsd:dateTime ;
      interop:grantee ${accessRequest.fromSocialAgent
      .map((r) => "<" + r + ">")
      .join(", ")} ;
      interop:hasAccessNeedGroup <${accessNeedGroup.uri}> .
    `

  await createResource(authorizationRegistry.value, payload, authFetch.value)
    .catch((err) => {
      toast.add({
        severity: "error",
        summary: "Failed to create Access Authorization!",
        detail: err,
        life: 5000,
      });
      throw new Error(err);
    })
    .then(() =>
      toast.add({
        severity: "success",
        summary: "Access Authorization created.",
        life: 5000,
      })
    );
}


async function getAuthorization(accessRequest: AccessRequest): Promise<{ uri: string; store: Store } | null> {

  const authorizationDocuments = await
    getResource(authorizationRegistry.value, authFetch.value)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Could not get authorization registry!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
      .then((resp) => resp.text())
      .then((txt) => parseToN3(txt, authorizationRegistry.value))
      .then((parsedN3) => {
        return parsedN3.store.getObjects(authorizationRegistry.value, LDP("contains"), null).map(o => o.value);
      });


  for (const authorizationDocument of authorizationDocuments) {
    const authstore = await getResource(authorizationDocument, authFetch.value)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Could not get authorization!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
      .then((resp) => resp.text())
      .then((txt) => parseToN3(txt, authorizationDocument))
      .then((parsedN3) => {
        return parsedN3.store;
      })
    const authorizationURIs = authstore.getSubjects(RDF("type"), INTEROP("AccessAuthorization"), null).map(s => s.value)
    for (const authorizationURI of authorizationURIs) {
      if (authstore.getQuads(authorizationURI, AUTH("hasAccessRequest"), accessRequest.uri, null).length == 1) {
        return { uri: authorizationURI, store: authstore }
      }
    }
  }
  return null;
}

let associatedAuthorization: Ref<{ uri: string; store: Store } | null> = ref(null);
watch(() => accessRequestObjects.value.length,
  () => getAuthorization(accessRequestObjects.value[0])
    .then(authorization => { associatedAuthorization.value = authorization })
)

let purposeLabel = ref(new Map())
watch(() => accessRequestObjects.value,
  () => getResource(GDPRP(''), authFetch.value)
    .then((resp) => resp.text())
    .then((txt) => parseToN3(txt, GDPRP('')))
    .then((parsedN3) => accessRequestObjects.value.map(ar => {
      purposeLabel.value.set(ar, ar.purpose.map((uri) => parsedN3.store.getObjects(uri, RDFS('label'), null).map(o => o.value)[0]));
    }))
)

function isAuthorizationEmpty(authorization: { uri: string; store: Store }): boolean {
  return authorization.store.getQuads(authorization.uri, INTEROP('hasDataAuthorization'), null, null).length == 0
}



async function deleteAccessRights(accessRequest: AccessRequest) {
  // PATCH ACL
  for (const accessNeedGroup of accessRequest.hasAccessNeedGroup) {
    for (const accessNeed of accessNeedGroup.hasAccessNeed) {
      for (const shapeTree of accessNeed.registeredShapeTree) {
        const dataRegistrations = await getDataRegistrationContainers(
          `${sessionInfo.webId}`,
          shapeTree,
          authFetch.value
        ).catch((err) => {
          toast.add({
            severity: "error",
            summary: "Error on getDataRegistrationContainers!",
            detail: err,
            life: 5000,
          });
          throw new Error(err);
        });

        const dataInstances = [] as string[];
        dataInstances.push(...accessNeed.hasDataInstance); // potentially manually edited (added/removed) in auth agent

        const accessToResources =
          dataInstances.length > 0 ? dataInstances : dataRegistrations;

        for (const resource of accessToResources) {
          await deleteAccessControlListEntries(
            resource,
            accessRequest.fromSocialAgent,
            accessNeed.accessMode,
            dataRegistrations[0]
          );
        }
      }
    }
  }
  const archivedAccessAuthorizationURI = await moveAssociatedAuthorizationToArchive();

  const accessAuthorizationNewURI = await createResource(authorizationRegistry.value, "", authFetch.value)
    .catch((err) => {
      toast.add({
        severity: "error",
        summary: "Failed to create Access Authorization!",
        detail: err,
        life: 5000,
      });
      throw new Error(err);
    })
    .then((result) => {
      toast.add({
        severity: "success",
        summary: "Access authorized.",
        life: 5000,
      })
      return getLocationHeader(result)
    }
    );
  let accessAuthorizationContentNew = ""
  const dataAutorizations = associatedAuthorization.value!.store.getObjects(null, INTEROP("hasDataAuthorization"), null)
  for (const dataAutorization of dataAutorizations) {
    associatedAuthorization.value!.store.removeQuads(associatedAuthorization.value!.store.getQuads(dataAutorization, null, null, null))
    associatedAuthorization.value!.store.removeQuads(associatedAuthorization.value!.store.getQuads(null, new NamedNode(INTEROP("hasDataAuthorization")), dataAutorization, null))
  }
  associatedAuthorization.value!.store.addQuad(new NamedNode(accessAuthorizationNewURI), new NamedNode(INTEROP("replaces")), new NamedNode(archivedAccessAuthorizationURI))

  const oldQuads = associatedAuthorization.value!.store.getQuads(new NamedNode(associatedAuthorization.value!.uri), null, null, null)
  for (const quad of oldQuads) {
    associatedAuthorization.value!.store.addQuad(new NamedNode(accessAuthorizationNewURI), quad.predicate, quad.object, quad.graph)
    associatedAuthorization.value!.store.removeQuad(quad);
  }
  const writerNew = new Writer({ format: "text/turtle" })
  writerNew.addQuads(associatedAuthorization.value!.store.getQuads(null, null, null, null))
  writerNew.end((_, result) => (accessAuthorizationContentNew = result))
  // create new AccessAuthorization
  await putResource(accessAuthorizationNewURI, accessAuthorizationContentNew, authFetch.value)
    .catch((err) => {
      toast.add({
        severity: "error",
        summary: "Failed to create Access Authorization!",
        detail: err,
        life: 5000,
      });
      throw new Error(err);
    })
    .then(() =>
      toast.add({
        severity: "success",
        summary: "Access authorized.",
        life: 5000,
      })
    );
  getAuthorization(accessRequest)
    .then(authorization => { associatedAuthorization.value = authorization })
}

async function moveAssociatedAuthorizationToArchive() {
  // check if archive container exists
  // create archive container if needed
  const archiveContainerUri = storage.value + "authorization-archive/";
  const archiveContainer = await getResource(archiveContainerUri, authFetch.value)
    .catch(() => { });

  if (!archiveContainer) {
    await createContainer(storage.value, "authorization-archive", authFetch.value)
      .catch((err) => {
        toast.add({
          severity: "error",
          summary: "Failed to create Authorization Archive Container!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      })
  }

  let accessAuthorizationContent = ""
  const writer = new Writer({ format: "text/turtle" })
  writer.addQuads(associatedAuthorization.value!.store.getQuads(null, null, null, null))
  writer.end((_, result) => (accessAuthorizationContent = result))
  // write old access authorization to archive
  const archivedAccessAuthorizationURI = createResource(archiveContainerUri, accessAuthorizationContent, authFetch.value)
    .then((result) => {
      toast.add({
        severity: "success",
        summary: "Access authorized.",
        life: 5000,
      })
      return getLocationHeader(result)
    })
    .catch((err) => {
      toast.add({
        severity: "error",
        summary: "Failed to create Access Authorization!",
        detail: err,
        life: 5000,
      });
      throw new Error(err);
    });

  // delete old access authorization from authorization registry
  await deleteResource(associatedAuthorization.value?.uri!, authFetch.value)
    .catch((err) => {
      toast.add({
        severity: "error",
        summary: "Failed to delete old Access Authorization!",
        detail: err,
        life: 5000,
      });
      throw new Error(err);
    })
  return archivedAccessAuthorizationURI
}

async function deleteAccessControlListEntries(resource: string, fromSocialAgent: string[], accessMode: string[], dataRegistrationUri: string) {
  const body = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
                @prefix acl: <http://www.w3.org/ns/auth/acl#>.

                _:rename a solid:InsertDeletePatch;
                solid:where   {
                  ?aclEntry acl:agent ${fromSocialAgent
      .map((r) => "<" + r + ">")
      .join(", ")} .
                  ?aclEntry acl:accessTo <${resource}>.
                };
                solid:deletes { ?aclEntry acl:agent ${fromSocialAgent
      .map((r) => "<" + r + ">")
      .join(", ")} . } .`

  await patchResource(dataRegistrationUri + ".acl", body, authFetch.value).catch(
    (err) => {
      toast.add({
        severity: "error",
        summary: "Error on patching ACL!",
        detail: err,
        life: 5000,
      });
      throw new Error(err);
    }
  );
}

async function freezeAuthorizations(accessRequest: AccessRequest) {
  const dataAuthorizations = associatedAuthorization.value?.store.getObjects(associatedAuthorization.value?.uri, INTEROP("hasDataAuthorization"), null).map(o => o.value)!
  for (const dataAuthorization of dataAuthorizations) {
    if (associatedAuthorization.value?.store.getQuads(dataAuthorization, INTEROP("scopeOfAuthorization"), INTEROP("SelectedFromRegistry"), null).length == 1) {
      continue
    }
    const shapeTree = associatedAuthorization.value?.store.getObjects(dataAuthorization, INTEROP("registeredShapeTree"), null)[0].value!
    const dataRegistrations = await getDataRegistrationContainers(
      `${sessionInfo.webId}`,
      shapeTree,
      authFetch.value
    ).catch((err) => {
      toast.add({
        severity: "error",
        summary: "Error on getDataRegistrationContainers!",
        detail: err,
        life: 5000,
      });
      throw new Error(err);
    });
    const dataInstances = [] as string[];
    for (const dataRegistration of dataRegistrations) {
      const dataInstancesOfRegistration = await getResource(dataRegistration, authFetch.value)
        .catch((err) => {
          toast.add({
            severity: "error",
            summary: "Could not get data registration!",
            detail: err,
            life: 5000,
          });
          throw new Error(err);
        })
        .then((resp) => resp.text())
        .then((txt) => parseToN3(txt, dataRegistration))
        .then((parsedN3) =>
          parsedN3.store.getObjects(dataRegistration, LDP("contains"), null).map(o => o.value)
        );
      dataInstances.push(...dataInstancesOfRegistration);

      // TODO acl anpassen: von Container Zugriff auf Data Instance Zugriff


      associatedAuthorization.value!.store.removeQuads(associatedAuthorization.value!.store.getQuads(dataAuthorization, INTEROP("scopeOfAuthorization"), INTEROP("SelectedFromRegistry"), null))
      // await patch container remove permissions (acl:default container und acl:accessTo container)
      const patchString = `\
@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix acl: <http://www.w3.org/ns/auth/acl#>.

_:rename a solid:InsertDeletePatch;
  solid:delete {  ?auth acl:agent ${accessRequest.fromSocialAgent.map((a) => "<" + a + ">").join(", ")}  } .
`
      // await patchResource(dataRegistration.split('#')[0] + ".acl", patchString, authFetch.value)
      //   .catch((err) => {
      //     toast.add({
      //       severity: "error",
      //       summary: "Could not patch data instance .acl!",
      //       detail: err,
      //       life: 5000,
      //     });
      //     throw new Error(err);
      //   })       
      console.log(patchString)
      associatedAuthorization.value!.store.addQuad(new NamedNode(dataAuthorization), new NamedNode(INTEROP("scopeOfAuthorization")), new NamedNode(INTEROP("SelectedFromRegistry")))
      associatedAuthorization.value!.store.removeQuads(associatedAuthorization.value!.store.getQuads(null, new NamedNode(INTEROP("hasDataRegistration")), null, null))
      for (const dataInstance of dataInstancesOfRegistration) {
        // await patch resources add permissions (wie acl:acecssTo in AccessRequest oder in Authorization beschrieben)
        // this is not how this is supposed to be. oh well.
        const patchString = `\
@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix acl: <http://www.w3.org/ns/auth/acl#>.

_:rename a solid:InsertDeletePatch;
  solid:inserts { _:auth
    a acl:Authorization;
    acl:accessTo <${dataInstance}>;
    acl:agent ${accessRequest.fromSocialAgent.map((a) => "<" + a + ">").join(", ")};
    acl:mode ${accessRequest.hasAccessNeedGroup
            .map(accessNeedGroup => accessNeedGroup.hasAccessNeed
              .map(accessNeed => accessNeed.accessMode
                .map((mode) => "<" + mode + ">").join(", ")))} .
  } .
`
        // await patchResource(dataInstance.split('#')[0] + ".acl", patchString, authFetch.value)
        //   .catch((err) => {
        //     toast.add({
        //       severity: "error",
        //       summary: "Could not patch data instance .acl!",
        //       detail: err,
        //       life: 5000,
        //     });
        //     throw new Error(err);
        //   })
        console.log(patchString)
        associatedAuthorization.value!.store.addQuad(new NamedNode(dataAuthorization), new NamedNode(INTEROP("hasDataInstance")), new NamedNode(dataInstance))
        const oldQuads = associatedAuthorization.value!.store.getQuads(new NamedNode(associatedAuthorization.value!.uri), null, null, null)
        for (const quad of oldQuads) {
          associatedAuthorization.value!.store.addQuad(new NamedNode(dataAuthorization), quad.predicate, quad.object, quad.graph)
          associatedAuthorization.value!.store.removeQuad(quad);
        }
      }
    }
  }
  const archivedAccessAuthorizationURI = await moveAssociatedAuthorizationToArchive();

  const accessAuthorizationNewURI = await createResource(authorizationRegistry.value, "", authFetch.value)
    .then((result) => {
      toast.add({
        severity: "success",
        summary: "Access authorized.",
        life: 5000,
      })
      return getLocationHeader(result)
    })
    .catch((err) => {
      toast.add({
        severity: "error",
        summary: "Failed to create Access Authorization!",
        detail: err,
        life: 5000,
      });
      throw new Error(err);
    });
  let accessAuthorizationContentNew = ""
  associatedAuthorization.value!.store.addQuad(new NamedNode(accessAuthorizationNewURI), new NamedNode(INTEROP("replaces")), new NamedNode(archivedAccessAuthorizationURI))

  const oldQuads = associatedAuthorization.value!.store.getQuads(new NamedNode(associatedAuthorization.value!.uri), null, null, null)
  for (const quad of oldQuads) {
    associatedAuthorization.value!.store.addQuad(new NamedNode(accessAuthorizationNewURI), quad.predicate, quad.object, quad.graph)
    associatedAuthorization.value!.store.removeQuad(quad);
  }
  const writerNew = new Writer({ format: "text/turtle" })
  writerNew.addQuads(associatedAuthorization.value!.store.getQuads(null, null, null, null))
  writerNew.end((_, result) => (accessAuthorizationContentNew = result))
  // create new AccessAuthorization
  await putResource(accessAuthorizationNewURI, accessAuthorizationContentNew, authFetch.value)
    .catch((err) => {
      toast.add({
        severity: "error",
        summary: "Failed to create Access Authorization!",
        detail: err,
        life: 5000,
      });
      throw new Error(err);
    })
    .then(() =>
      toast.add({
        severity: "success",
        summary: "Access authorized.",
        life: 5000,
      })
    );
  getAuthorization(accessRequest)
    .then(authorization => { associatedAuthorization.value = authorization })

}
}
*/
</script> 
