import {useSolidProfile, useSolidSession} from "@shared/composables";
import {AUTH, createContainer, getContainerItems, getResource, parseToN3} from "@shared/solid";
import {Store} from "n3";
import {computed, ref, watch} from "vue";

export const useAuthorizations = () => {
    const {session} = useSolidSession();
    const {accessInbox, storage} = useSolidProfile();

    // keep track of access requests
    const accessRequestInformationResources = ref<string[]>([]);

    // keep track of access receipts
    const accessReceiptInformationResources = ref<string[]>([]);

    // concrete access request URI (optional)
    const inspectedAccessRequestURI = ref<string | null>(null);

    // create data authorization container if needed
    const dataAuthzContainerName = "data-authorizations"
    const dataAuthzContainer = computed(() => storage.value + dataAuthzContainerName + "/");

    // create access authorization container if needed
    const accessAuthzContainerName = "authorization-registry"
    const accessAuthzContainer = computed(() => storage.value + accessAuthzContainerName + "/");

    // create access authorization container if needed
    const accessAuthzArchiveContainerName = "authorization-archive"
    const accessAuthzArchiveContainer = computed(() => storage.value + accessAuthzArchiveContainerName + "/");

    // create access receipt container if needed
    const accessReceiptContainerName = "authorization-receipts"
    const accessReceiptContainer = computed(() => storage.value + accessReceiptContainerName + "/");

    const reload = () => {
        refreshAccessRequestInformationResources()
        refreshAccessReceiptInformationResources();
    };

    watch(storage, async () => {
        if (!storage.value) {
            return
        }
        getResource(dataAuthzContainer.value, session)
            .catch(() => createContainer(storage.value, dataAuthzContainerName, session))
            .catch((err) => {
                toast.add({
                    severity: "error",
                    summary: "Failed to create Data Authorization Container!",
                    detail: err,
                    life: 5000,
                });
                throw new Error(err);
            })
        getResource(accessAuthzContainer.value, session)
            .catch(() => createContainer(storage.value, accessAuthzContainerName, session))
            .catch((err) => {
                toast.add({
                    severity: "error",
                    summary: "Failed to create Access Authorization Container!",
                    detail: err,
                    life: 5000,
                });
                throw new Error(err);
            })
        getResource(accessAuthzArchiveContainer.value, session)
            .catch(() => createContainer(storage.value, accessAuthzArchiveContainerName, session))
            .catch((err) => {
                toast.add({
                    severity: "error", summary: "Failed to create Access Receipt Container!", detail: err, life: 5000,
                });
                throw new Error(err);
            })
        getResource(accessReceiptContainer.value, session)
            .catch(() => createContainer(storage.value, accessReceiptContainerName, session))
            .catch((err) => {
                toast.add({
                    severity: "error", summary: "Failed to create Access Receipt Container!", detail: err, life: 5000,
                });
                throw new Error(err);
            })
    }, {immediate: true});

    // once an access inbox is available, get the access requests from there
    // except when we have a specific access request to focus on. then only focus on that one.
    watch(accessInbox, () => {
        reload();
    }, {immediate: true});

    /**
     * Retrieve access requests from an access inbox
     * @param accessInbox
     */
    async function getAccessRequestInformationResources(accessInbox: string) {
        if (!accessInbox) {
            return [];
        }
        if (inspectedAccessRequestURI.value) {
            return [inspectedAccessRequestURI.value.split('#')[0]]
        }
        return await getContainerItems(accessInbox, session)
    }

    /**
     * get the access receipts
     */
    async function getAccessReceiptInformationResources() {
        return await getContainerItems(accessReceiptContainer.value, session)
    }

    /**
     * get the access receipt(s) of accessRequestURI
     */
    async function getAccessReceiptInformationResourcesForAccessRequest(accessRequestURI: string) {
        const accessReceiptStore = new Store();
        const accessReceiptContainerItems = await getAccessReceiptInformationResources();
        await fillItemStoresIntoStore(accessReceiptContainerItems, accessReceiptStore)


        /**
         * Util Functions
         */
        async function fillItemStoresIntoStore(itemUris: string[], store: Store) {
            const itemStores: Store[] = await Promise.all(itemUris.map((item) => fetchStoreOf(item)))
            itemStores
                .map(itemStore => itemStore.getQuads(null, null, null, null))
                .map((quads) => store.addQuads(quads))
        }

        async function fetchStoreOf(uri: string): Promise<Store> {
            return getResource(uri, session)
                .catch((err) => {
                    toast.add({
                        severity: "error", summary: "Error on fetchDemand!", detail: err, life: 5000,
                    });
                    throw new Error(err);
                })
                .then((resp) => resp.data)
                .then((txt) => parseToN3(txt, uri))
                .then((parsedN3) => parsedN3.store);
        }

        return accessReceiptStore.getSubjects(AUTH("hasAccessRequest"), accessRequestURI, null).map(subject => subject.value);
    }


    async function refreshAccessRequestInformationResources() {
        const newListOfAccessRequests: string[] = await getAccessRequestInformationResources(accessInbox.value);
        accessRequestInformationResources.value = [...newListOfAccessRequests]
    }

    async function refreshAccessReceiptInformationResources() {
        const newListOfAccessReceipts: string[] = inspectedAccessRequestURI.value ? await getAccessReceiptInformationResourcesForAccessRequest(inspectedAccessRequestURI.value) : await getAccessReceiptInformationResources();
        accessReceiptInformationResources.value = [...newListOfAccessReceipts];
    }

    return {
        reload,
        refreshAccessReceiptInformationResources,
        accessRequestInformationResources,
        accessReceiptInformationResources,
        dataAuthzContainer,
        accessAuthzContainer,
        accessAuthzArchiveContainer,
        accessReceiptContainer,
    }
}
