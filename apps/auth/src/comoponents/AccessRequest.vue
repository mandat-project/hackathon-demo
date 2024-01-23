<template>
  <div accessRequestObjects v-for="accessRequest in accessRequestObjects" :key="accessRequest.uri">
    <div>
      To
      <a v-for="recipient in accessRequest.toSocialAgent" :key="recipient" :href="recipient">
        {{ recipient }}
      </a>
    </div>
    <div>
      From
      <a v-for="sender in accessRequest.fromSocialAgent" :key="sender" :href="sender">
        {{ sender }}
      </a>
    </div>
    <div>
      <strong>From Demand: </strong>
      <a v-for="demand in accessRequest.fromDemand" :key="demand" :href="demand">
        {{ demand }}
      </a>
    </div>
    <!--  -->
    <div v-for="accessNeedGroup in accessRequest.hasAccessNeedGroup" :key="accessNeedGroup.uri">
      <Divider/>
      <div>
        Label:
        <a v-for="label in accessNeedGroup.accessNeedGroupDescriptionLabel" :key="label">
          {{ label }}
        </a>
      </div>
      <div>
        Definition:
        <a v-for="definition in accessNeedGroup.accessNeedGroupDescriptionDefinition" :key="definition">
          {{ definition }}
        </a>
      </div>
      <!--  -->
      <div v-for="accessNeed in accessNeedGroup.hasAccessNeed" :key="accessNeed.uri">
        <Divider/>
        <div>
          <strong>Access Mode: </strong>
          <a v-for="accessMode in accessNeed.accessMode" :key="accessMode" :href="accessMode">
            {{ accessMode }}
          </a>
        </div>
        <div>
          <strong>Required Data: </strong>
          <a v-for="shapeTree in accessNeed.registeredShapeTree" :key="shapeTree" :href="shapeTree">
            {{ shapeTree }}
          </a>
        </div>
        <div v-if="accessNeed.hasDataInstance.length > 0">
          <strong>Required Instances: </strong>
          <a v-for="dataInstance in accessNeed.hasDataInstance" :key="dataInstance" :href="dataInstance">
            {{ dataInstance }}
          </a>
        </div>
      </div>
    </div>
    <Button @click="authorizeAndGrantAccess(accessRequest)" type="button" style="margin: 20px"
            class="btn btn-primary">Authorize
    </Button>
  </div>
</template>

<script setup lang="ts">
import {useSolidProfile, useSolidSession} from "@shared/composables";
import {
  getResource,
  parseToN3,
  RDF,
  INTEROP,
  ACL,
  LDP,
  XSD,
  createResource,
  putResource,
  getDataRegistrationContainers,
  CREDIT,
  SKOS,
  AccessNeed,
  AccessNeedGroup,
  AccessRequest,
  AUTH, patchResource, getLocationHeader, createContainer, deleteResource,
} from "@shared/solid";
import {Store} from "n3";
import {useToast} from "primevue/usetoast";
import {computed, reactive, ref, Ref, watch} from "vue";

const props = defineProps(["resourceURI", "redirect"]);
const {authFetch, sessionInfo} = useSolidSession();
const {authorizationRegistry, storage} = useSolidProfile();
const toast = useToast();

const store = reactive(new Store());
getResource(props.resourceURI, authFetch.value)
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
  .then((parsedN3) =>
    store.addQuads(parsedN3.store.getQuads(null, null, null, null))
  );

const accessRequestObjects = computed(() => {
  const result = [];
  const accessRequests = store.getSubjects(
    RDF("type"),
    INTEROP("AccessRequest"),
    null
  );
  for (const accessRequest of accessRequests) {
    const toSocialAgent = store
      .getObjects(accessRequest, INTEROP("toSocialAgent"), null)
      .map((uri) => uri.value);
    const fromSocialAgent = store
      .getObjects(accessRequest, INTEROP("fromSocialAgent"), null)
      .map((uri) => uri.value);
    const fromDemand = store
      .getObjects(accessRequest, CREDIT("fromDemand"), null)
      .map((uri) => uri.value);
    const hasAccessNeedGroup = store.getObjects(
      accessRequest,
      INTEROP("hasAccessNeedGroup"),
      null
    );

    const accessNeedGroupObjects = [];
    for (const accessNeedGroup of hasAccessNeedGroup) {
      const groupDescriptions = store.getSubjects(
        INTEROP("hasAccessNeedGroup"),
        accessNeedGroup,
        null
      );
      const labels = [];
      const definitions = [];
      for (const groupDescription of groupDescriptions) {
        labels.push(
          ...store
            .getObjects(groupDescription, SKOS("prefLabel"), null)
            .map((literal) => literal.value)
        );
        definitions.push(
          ...store
            .getObjects(groupDescription, SKOS("definition"), null)
            .map((literal) => literal.value)
        );
      }
      const hasAccessNeed = store.getObjects(
        accessNeedGroup,
        INTEROP("hasAccessNeed"),
        null
      );
      const accessNeedObjects = [];
      for (const accessNeed of hasAccessNeed) {
        const needDescriptions = store.getSubjects(
          INTEROP("hasAccessNeed"),
          accessNeed,
          null
        );
        const labels = [];
        const definitions = [];
        for (const needDescription of needDescriptions) {
          labels.push(
            ...store
              .getObjects(needDescription, SKOS("prefLabel"), null)
              .map((literal) => literal.value)
          );
          definitions.push(
            ...store
              .getObjects(needDescription, SKOS("definition"), null)
              .map((literal) => literal.value)
          );
        }
        const accessMode = store
          .getObjects(accessNeed, INTEROP("accessMode"), null)
          .map((uri) => uri.value);
        const registeredShapeTree = store
          .getObjects(accessNeed, INTEROP("registeredShapeTree"), null)
          .map((uri) => uri.value);
        const accessNecessity = store
          .getObjects(accessNeed, INTEROP("accessNecessity"), null)
          .map((uri) => uri.value);
        const hasDataInstance = store
          .getObjects(accessNeed, INTEROP("hasDataInstance"), null)
          .map((uri) => uri.value);
        accessNeedObjects.push({
          uri: accessNeed.value,
          accessNeedDescriptionLabel: labels,
          accessNeedDescriptionDefinition: definitions,
          accessMode,
          registeredShapeTree,
          hasDataInstance,
          accessNecessity,
        } as AccessNeed);
      }
      accessNeedGroupObjects.push({
        uri: accessNeedGroup.value,
        accessNeedGroupDescriptionLabel: labels,
        accessNeedGroupDescriptionDefinition: definitions,
        hasAccessNeed: accessNeedObjects,
      } as AccessNeedGroup);
    }
    result.push({
      uri: accessRequest.value,
      toSocialAgent,
      fromSocialAgent,
      fromDemand,
      hasAccessNeedGroup: accessNeedGroupObjects,
    } as AccessRequest);
  }
  return result;
});


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
        await createAccessAuthorization(
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

  // Get content old AccessAuthorization
  const accessAuthorizationContent = await getResource(associatedAuthorization.value?.uri!, authFetch.value)
    .catch((err) => {
      toast.add({
        severity: "error",
        summary: "Could not get accessAuthorization Content!",
        detail: err,
        life: 5000,
      });
      throw new Error(err);
    })
    .then((resp) => resp.text());


  // check if archive container exists
  // create archive container if needed
  const archiveContainerUri = storage.value + "/authorization-archive";
  const archiveContainer = await getResource(archiveContainerUri, authFetch.value);

  if(!archiveContainer) {
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

  // write old access authorization to archive
  const archivedAccessAuthorizationURI = await createResource(archiveContainerUri, accessAuthorizationContent, authFetch.value)
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

  // prepare content new AccessAuthorization
  const newAccessAuthorizationContent = accessAuthorizationContent.replace("interop:hasDataAuthorization <#dataAuthorization> .",
    "interop:replaces " + archivedAccessAuthorizationURI + " .")
    .split("<#dataAuthorization>")[0];

  // create new AccessAuthorization
  await createResource(authorizationRegistry.value, newAccessAuthorizationContent, authFetch.value)
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

  // delete old access authorization from authorization registry
  deleteResource(associatedAuthorization.value?.uri!, authFetch.value)
    .catch((err) => {
    toast.add({
      severity: "error",
      summary: "Failed to delete old Access Authorization!",
      detail: err,
      life: 5000,
    });
    throw new Error(err);
  })
}

async function deleteAccessControlListEntries(resource: string, fromSocialAgent: string[], accessMode: string[], dataRegistrationUri: string) {
  const body = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
                @prefix acl: <http://www.w3.org/ns/auth/acl#>.

                _:rename a solid:InsertDeletePatch;
                solid:where   {
                  ?aclEntry acl:agent ${fromSocialAgent
    .map((r) => "<" + r + ">")
    .join(", ")} .
                  ?aclEntry acl:accessTo ${resource.substring(resource.lastIndexOf('/'))}.
                };
                solid:deletes { ?aclEntry acl:agent ${fromSocialAgent
    .map((r) => "<" + r + ">")
    .join(", ")} .`

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

async function createAccessAuthorization(
  accessRequest: AccessRequest,
  accessNeedGroup: AccessNeedGroup,
  accessNeed: AccessNeed,
  registrations: string[],
  instances?: string[]
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
      interop:hasAccessNeedGroup <${accessNeedGroup.uri}> ;
      interop:hasDataAuthorization <#dataAuthorization> .

    <#dataAuthorization>
      a interop:DataAuthorization ;
      interop:grantee ${accessRequest.fromSocialAgent
    .map((r) => "<" + r + ">")
    .join(", ")} ;
      interop:registeredShapeTree ${accessNeed.registeredShapeTree
    .map((t) => "<" + t + ">")
    .join(", ")} ;
      interop:accessMode ${accessNeed.accessMode
    .map((m) => "<" + m + ">")
    .join(", ")} ;
      interop:scopeOfAuthorization  ${instances && instances.length > 0
    ? "interop:SelectedFromRegistry"
    : "interop:AllFromRegistry"
  } ;
      interop:hasDataRegistration ${registrations
    .map((r) => "<" + r + ">")
    .join(", ")} ;
      ${instances && instances.length > 0
    ? "interop:hasDataInstance " +
    instances.map((i) => "<" + i + ">").join(", ") +
    " ;"
    : ""
  }
      interop:satisfiesAccessNeed <${accessNeed.uri}> .`;

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
        summary: "Access authorized.",
        life: 5000,
      })
    );
}

async function getAuthorization(accessRequest: AccessRequest) {

  const authorizations = await
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


  for (const authorization of authorizations) {
    const authstore = await getResource(authorization, authFetch.value)
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
      .then((txt) => parseToN3(txt, authorization))
      .then((parsedN3) => {
        return parsedN3.store;
      })

    if (authstore.getQuads(authorization, AUTH("hasAccessRequest"), accessRequest.uri, null).length == 1) {
      return {uri: authorization, store: authstore}
    }
  }
  return null;
}

let associatedAuthorization: Ref<{ uri: string; store: Store } | null> = ref(null);
watch(() => accessRequestObjects.value,
  () => getAuthorization(accessRequestObjects.value[0])
    .then(authorization => {
      associatedAuthorization.value = authorization
    })
)

async function updateAccessControlList(
  accessTo: string,
  agent: string[],
  mode: string[]
) {
  const txt = await getResource(accessTo + ".acl", authFetch.value)
    .catch((err) => {
      const newACL = `\
@prefix : <#>.
@prefix acl: <http://www.w3.org/ns/auth/acl#>.
@prefix foaf: <http://xmlns.com/foaf/0.1/>.
<#owner> a acl:Authorization;
    acl:accessTo <.${accessTo.substring(accessTo.lastIndexOf('/'))}>;
    acl:agent <${sessionInfo.webId}>;
    acl:default <.${accessTo.substring(accessTo.lastIndexOf('/'))}>;
    acl:mode acl:Read, acl:Write, acl:Control.
`;
      return putResource(accessTo + ".acl", newACL, authFetch.value)
        .then(() => getResource(accessTo + ".acl", authFetch.value))
    })
    .then((resp) => resp.text());
  const acl = `\
<#grantee>
    a acl:Authorization;
    acl:accessTo <.${accessTo.substring(accessTo.lastIndexOf('/'))}>;
    acl:agent ${agent.map((a) => "<" + a + ">").join(", ")};
    acl:default <.${accessTo.substring(accessTo.lastIndexOf('/'))}>;
    acl:mode ${mode.map((m) => "<" + m + ">").join(", ")} .
`;

  await putResource(accessTo + ".acl", txt + acl, authFetch.value).catch(
    (err) => {
      toast.add({
        severity: "error",
        summary: "Error on put updateAccessControlList!",
        detail: err,
        life: 5000,
      });
      throw new Error(err);
    }
  );
}

async function setDemandIsAccessRequestGranted(fromDemandURI: string) {
  getResource(fromDemandURI, authFetch.value)
    .catch((err) => {
      toast.add({
        severity: "error",
        summary: "Error on get Demand!",
        detail: err,
        life: 5000,
      });
      throw new Error(err);
    })
    .then((resp) => resp.text())
    .then((txt) =>
      txt.replace("isAccessRequestGranted false", "isAccessRequestGranted true")
    )
    .then((body) => {
      return putResource(fromDemandURI, body, authFetch.value).catch((err) => {
        toast.add({
          severity: "error",
          summary: "Error on put Demand!",
          detail: err,
          life: 5000,
        });
        throw new Error(err);
      });
    });
}
</script>
