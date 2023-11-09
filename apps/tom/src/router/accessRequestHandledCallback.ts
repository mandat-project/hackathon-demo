import { useSolidSession } from "@shared/composables";
import { CREDIT, XSD } from "@shared/solid";
// eslint-disable-next-line
import {
  getResource,
  parseToN3,
  putResource,
} from "@shared/solid/src/solidRequests";
import { Literal, NamedNode, Quad, Writer } from "n3";
import router from ".";

export default async function onResult(
  accessRequestUri: string,
  result: string
) {
  console.log("App logic here:");
  console.log(accessRequestUri);
  console.log(result);

  const { authFetch } = useSolidSession();

  const store = await getResource(accessRequestUri, authFetch.value)
    .then((resp) => resp.text())
    .then((txt) => parseToN3(txt, accessRequestUri))
    .then((parsedN3) => parsedN3.store);

  const demandUri = store.getObjects(
    accessRequestUri,
    CREDIT("fromDemand"),
    null
  )[0].value;

  // patch demand
  getResource(demandUri, authFetch.value)
    .then((resp) => resp.text())
    .then((txt) => parseToN3(txt, demandUri))
    .then((parsedN3) => {
      parsedN3.store.removeQuads(
        parsedN3.store.getQuads(
          new NamedNode(demandUri),
          new NamedNode(CREDIT("isAccessRequestGranted")),
          null,
          null
        )
      );
      parsedN3.store.addQuad(
        new NamedNode(demandUri),
        new NamedNode(CREDIT("isAccessRequestGranted")),
        new Literal(`"true"^^${XSD("boolean")}`)
      );
      const writer = new Writer({
        format: "text/turtle",
        prefixes: parsedN3.prefixes,
      });
      writer.addQuads(parsedN3.store.getQuads(null, null, null, null));
      let body = "";
      writer.end((error, result) => (body = result));
      return body;
    })
    .then((body) => {
      return putResource(demandUri, body, authFetch.value);
    })
    .then(() => router.push({ name: "Home" }));
}

// this is a preliminary hack that relies on the fact that the app is able to fetch the access request.
// instead, what should be done, is that the accessRequestURI and result are saved somewhere in a memory store here in the app, 
// and this store is asked by the Demand component, if the access request was handled and what the result was.