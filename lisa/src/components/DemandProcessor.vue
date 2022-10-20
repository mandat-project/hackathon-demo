<template>
    <li>
        <span>Demand: {{ uri }} </span>
        <ul class="demands">
            <li><input type="button" value="get details of this demand" @click="getDemand(uri)" />
                <a v-if="dataRequestURI" href="{{ dataRequestURI }}">data request</a>
                <a v-if="dataProcessedURI" href="{{ dataProcessedURI}}">data request processed</a>
            </li>

            <li>
                <input type="button" value="demand additonal data from StB"
                    v-bind:disabled="dataRequestURI === '' || hasRequestedData || offerIsCreated"
                    @click="requestData(dataRequestURI)" />
            </li>
            <li>
                <input type="button" value="get processed data demand from StB"
                    v-bind:disabled="dataRequestURI === '' || hasRequestedData || offerIsCreated"
                    @click="getProcessedDemand(dataProcessedURI)" />
            </li>
            <li>
                <input type="button" value="create an offer for SME"
                    v-bind:disabled="dataRequestURI === '' || offerIsCreated"
                    @click="createOfferResource(uri, dataRequestURI,dataProcessedURI)" />
            </li>
            <li>
                <input type="button" value="check if offer was accepted" v-bind:disabled="!offerIsCreated"
                    @click="isOrderAccepted(uri)" />
                <span class="offerAcceptedStatus" v-if="offerIsAccepted">&check;</span>
                <span class="offerAcceptedStatus" v-if="!offerIsAccepted && offerIsCreated">&#9749;</span>
            </li>
        </ul>
    </li>

</template>

<script lang="ts">
import { useSolidProfile } from '@/composables/useSolidProfile';
import { useSolidSession } from '@/composables/useSolidSession';
import { CREDIT, LDP, SCHEMA } from '@/lib/namespaces';
import { createResource, getLocationHeader, getResource, parseToN3, patchResource, postResource, putResource } from '@/lib/solidRequests';
import { Store } from 'n3';
import { useToast } from 'primevue/usetoast';
import { computed, defineComponent, Ref, ref, toRefs } from 'vue';


export default defineComponent({
    name: "DemandProcessor",
    components: {},
    props: {
        uri: {
            type: String,
            required: true,
        },
    },
    setup(props, context) {
        const toast = useToast();
        const { authFetch, sessionInfo } = useSolidSession();
        const { isLoggedIn, webId } = toRefs(sessionInfo);
        const { storage } = useSolidProfile();

        const demandStore = ref(new Store())
        const processedDemandStore = ref(new Store())
        const orderStore = ref(new Store())

        const hasRequestedData = ref(false)
        const offerIsCreated = ref(false)
        const offerIsAccepted = ref(false)

        const getDemand = async (demand: string) => {
            await getResource(demand, authFetch.value)
                .catch((err) => {
                    toast.add({
                        severity: "error",
                        summary: "Error on fetch!",
                        detail: err,
                        life: 5000,
                    });
                    //      isLoading.value = false;
                    throw new Error(err);
                })
                .then((resp) => resp.text()).then((txt) => {
                    return parseToN3(txt, demand)
                }).then((parsedN3) => {
                    demandStore.value = parsedN3.store;
                });

            // check if an offer is already available
            offerIsCreated.value = isOfferCreated(demandStore.value)
            console.log("offerIsCreated", offerIsCreated.value)

            // check if an offer is already accepted
            offerIsAccepted.value = await isOrderAccepted(demand)
            console.log("orderIsAccepted", offerIsAccepted.value)

        }
        getDemand(props.uri)

        const isOfferCreated = (demandStore: Store) => {
            const offer = demandStore.getQuads(props.uri, CREDIT("hasOffer"), null, null)
            return offer.length > 0
        }

        const dataRequestURI = computed(() => {
            try {
                return demandStore.value.getQuads(props.uri, CREDIT("hasDataRequest"), null, null)[0].object.value
            } catch (error) {
                return ""
            }

        })
        const dataProcessedURI = computed(() => {
            try {
                return demandStore.value.getQuads(props.uri, CREDIT("hasDataProcessed"), null, null)[0].object.value
            } catch (error) {
                return ""
            }
        })

        const orderURI = computed(() => {
            try {
                return orderStore.value.getQuads(props.uri, CREDIT("hasOrder"), null, null)[0].object.value
            } catch (error) {
                return ""
            }
        })

        const requestData = async (requestURI: string) => {
            // simulate patch as it is not supported, warning: not atomic

            // GET the current data 
            const responseText = await getResource(requestURI, authFetch.value)
                .catch((err) => {
                    toast.add({
                        severity: "error",
                        summary: "Error on fetch!",
                        detail: err,
                        life: 5000,
                    });
                    throw new Error(err);
                })
                .then((resp) => resp.text())

            // create a body
            const body = responseText.concat(`
            <> <http://example.org/vocab/datev/credit#hasRequestedData> <#requestedData> .
                <#requestedData> a <http://exmaple.org/vocab/datev/credit#Balance> .
            `)

            // PUT the new data
            hasRequestedData.value = true;
            return putResource(requestURI, body, authFetch.value).then(resp => console.log(resp))
        }


        const getProcessedDemand = async (processedURI: string) => {
            return getResource(processedURI, authFetch.value)
                .catch((err) => {
                    toast.add({
                        severity: "error",
                        summary: "Error on fetch!",
                        detail: err,
                        life: 5000,
                    });
                    throw new Error(err);
                })
                .then((resp) => resp.text()).then((txt) => {
                    return parseToN3(txt, processedURI)
                }).then((parsedN3) => {
                    processedDemandStore.value = parsedN3.store;
                })
        };

        const patchDemand = async (demandURI: string, offerURI: string) => {
            // GET the current data 
            const responseText = await getResource(demandURI, authFetch.value)
                .catch((err) => {
                    toast.add({
                        severity: "error",
                        summary: "Error on fetch!",
                        detail: err,
                        life: 5000,
                    });
                    throw new Error(err);
                })
                .then((resp) => resp.text())

            // create a body
            const body = responseText.concat(`
                <${demandURI}> <http://example.org/vocab/datev/credit#hasOffer> <${offerURI}> .
            `)

            // PUT the new data
            hasRequestedData.value = true;
            return putResource(demandURI, body, authFetch.value)
        };

        const getOrderDetails = async (orderURI: string) => {
            return getResource(orderURI, authFetch.value)
                .catch((err) => {
                    toast.add({
                        severity: "error",
                        summary: "Error on fetch!",
                        detail: err,
                        life: 5000,
                    });
                    throw new Error(err);
                })
                .then((resp) => resp.text()).then((txt) => {
                    return parseToN3(txt, orderURI)
                }).then((parsedN3) => {
                    orderStore.value = parsedN3.store;
                })
        };
        const createOfferResource = async (demandURI: string, dataRequestURI: string, dataProcessedURI: string) => {
            const body = `
                @prefix : <#>. 
                @prefix credit: <http://example.org/vocab/datev/credit#> . 
                @prefix schema: <http://schema.org/> .
                <> a credit:Offer;
                schema:itemOffered <#credit>;
	            schema:availability schema:InStock;
                credit:derivedFromDemand <${demandURI}> ; 
                credit:derivedFromData <${dataProcessedURI}>; 
                credit:hasUnderlyingRequest <${dataRequestURI}> . 
                <${webId?.value}> schema:offers <>  .
	            <${await getDemanderUri()}> schema:seeks <>  .
                <http://example.com/loansAndCredits/c12345#credit>
            	        a schema:LoanOrCredit ;
            	        schema:amount "${demandStore.value.getObjects(null, SCHEMA("amount"), null)[0].value}" ;
            	        schema:currency "${demandStore.value.getObjects(null, SCHEMA("currency"), null)[0].value}";
            	        schema:annualPercentageRate "1.08";
            	        schema:loanTerm <#duration>.  
                <#duration> 
            	    a schema:QuantitativeValue;
            	    schema:value "10 years".
                `
            const offerURI = await createResource("https://bank.solid.aifb.kit.edu/credits/offers/", body, authFetch.value)
                .then(getLocationHeader)
            await patchDemand(demandURI, offerURI);
            await makeAvailableToDemandingWebId(offerURI, await getDemanderUri());
            await makeAvailableToDemandingWebId(demandURI, await getDemanderUri()); // for demand
            offerIsCreated.value = true;

        }

        const makeAvailableToDemandingWebId = async (uri: string, demandingWebId: string) => {
            const aclUri = uri + ".acl";
            const body = `
                @prefix : <#>. 
                @prefix acl: <http://www.w3.org/ns/auth/acl#> . 
                <#read> a acl:Authorization; 
                    acl:agent <${demandingWebId}>; 
                    acl:mode acl:Read; 
                    acl:accessTo <${uri}> . 
                <#control> a acl:Authorization; 
                    acl:agent <${webId?.value}>; 
                    acl:mode acl:Read,acl:Control,acl:Write; 
                    acl:accessTo <${uri}> . 
                `
            await putResource(aclUri, body, authFetch.value)
        }

        const getDemanderUri = async () => {
            const demanderURI = demandStore.value.getQuads(null, SCHEMA("seeks"), props.uri, null)[0].subject.value;
            return demanderURI;
        }

        const isOrderAccepted = async (demandURI: string) => {

            const ordersURI = storage.value + "credits/orders/";
            orderStore.value = await getAllOrders(ordersURI)

            const offerURI = demandStore.value.getQuads(demandURI, CREDIT("hasOffer"), null, null)[0].object.value;
            console.log("demand", demandURI, "has offerURI", offerURI)

            // add all values to the order store
            const orders = orderStore.value.getObjects(ordersURI, LDP("contains"), null).map((order) => order.value);
            console.log(orders)
            for (const order of orders) {
                console.log("available order:", order)
                await addOrderToStore(order)
            }

            let acceptedOffers = orderStore.value.getQuads(null, SCHEMA("acceptedOffer"), offerURI, null)

            if (acceptedOffers.length == 1) {
                console.log("offer accepted:", offerURI)
                offerIsAccepted.value = true;
                return true;
            } else if (acceptedOffers.length > 1) {
                console.warn("MORE than one offer accepted:", offerURI)
                return true;
            } else {
                console.log("offer NOT accepted:", offerURI)
                return false;
            }
        }

        const getAllOrders = async (ordersURI: string) => {
            return getResource(ordersURI, authFetch.value)
                .catch((err) => {
                    toast.add({
                        severity: "error",
                        summary: "Error on fetch!",
                        detail: err,
                        life: 5000,
                    });
                    throw new Error(err);
                })
                .then((resp) => resp.text())
                .then((txt) => parseToN3(txt, ordersURI))
                .then((parsedN3) => parsedN3.store)
        }

        const addOrderToStore = async (orderURI: string) => {
            return getResource(orderURI, authFetch.value)
                .catch((err) => {
                    toast.add({
                        severity: "error",
                        summary: "Error on fetch!",
                        detail: err,
                        life: 5000,
                    });
                    throw new Error(err);
                })
                .then((resp) => resp.text()).then((txt) => {
                    return parseToN3(txt, orderURI)
                }).then((parsedN3) => {
                    orderStore.value.addQuads(parsedN3.store.getQuads(null, null, null, null));
                })
        }


        return {
            getDemand,
            dataProcessedURI,
            dataRequestURI,
            requestData,
            createOfferResource,
            patchDemand,
            getProcessedDemand,
            isOrderAccepted,
            offerIsCreated,
            offerIsAccepted,
            getOrderDetails,
            hasRequestedData,
            getDemanderUri
        }
    }
});
</script>
<style>
.demands a {
    padding-left: 1em;
    color: white;
}

.offerAcceptedStatus {
    padding-left: 1em;
}
</style>