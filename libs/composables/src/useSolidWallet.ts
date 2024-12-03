/*
import {ref, watch} from "vue";
import {useSolidSession} from "./useSolidSession";
import {useSolidProfile} from "./useSolidProfile";
import {ACL, createContainer, FOAF, getContainerItems, getResource, putResource} from "hackathon-demo/libs/solid";

let socket: WebSocket;

const {session} = useSolidSession();

const creds = ref([] as String[]);
const {wallet, credStatusDir} = useSolidProfile();

const update = async (_uri: string) => {
    return getContainerItems(wallet.value,session)
        .then((items) => {
            for (const e of creds.value) {
                const i = items.indexOf(e.toString());
                if (i > -1) items.push(items.splice(i, 1)[0]);
            }
            creds.value = items;
        })
        .catch((err) => {
            // make sure wallet directory exists
            if (err.message.includes("`404`")) {
                console.log("Wallet not found, creating it now.")
                return createContainer(
                    `${wallet.value.split("wallet/")[0]}`,
                    "wallet",
                    session
                );
            }
            return err;
        });
};


const sub = async (uri: string) => {
    if (socket !== undefined) socket.close();
    const url = new URL(uri);
    url.protocol = "wss";

    socket = new WebSocket(url.href, ["solid-0.1"]);
    socket.onopen = function () {
        this.send(`sub ${uri}`);
        update(uri);
    };
    socket.onmessage = function (msg) {
        if (msg.data && msg.data.slice(0, 3) === "pub") {
            // resource updated, refetch resource
            console.log(msg);
            update(uri);
        }
    };
};

const updateSubscription = () => {
    if (!wallet.value.startsWith("http")) return;
    sub(wallet.value);
};
watch(() => wallet.value, updateSubscription);


// make sure that credential status directory exists
watch(credStatusDir, () => {
    if (credStatusDir.value === "") return;
    getResource(credStatusDir.value, session)
        .catch((err) => {
            // make sure credStatus directory exists
            if (err.message.includes("`404`")) {
                console.log("Credential Status directory not found, creating it now.")
                return createContainer(
                    `${credStatusDir.value.split("credentialStatus/")[0]}`,
                    "credentialStatus",
                    session
                ).then(() => {
                    const acl = `
  @prefix acl: <${ACL()}>.
  @prefix foaf: <${FOAF()}>.
  
  <#owner>
      a acl:Authorization;
      acl:agent
          <${session.webId}>;
  
      acl:accessTo <./>;
      acl:default <./>;
  
      acl:mode
          acl:Read, acl:Write, acl:Control.
  
  # Public read access for container items
  <#public>
      a acl:Authorization;
      acl:agentClass foaf:Agent;  # everyone
      acl:default <./>;
      acl:mode acl:Read.
  `
                    return putResource(credStatusDir.value + ".acl", acl, session)
                }).catch(err => console.log(err))
            }
            return err;
        });

}, {immediate: true})


export const useSolidWallet = () => {
    return {creds};
};
*/
