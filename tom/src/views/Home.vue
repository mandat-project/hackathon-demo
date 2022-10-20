<template>
  <div class="grid">
    <div class="col lg:col-6 lg:col-offset-3">
      
      <h1>Create Demand</h1>

      <h:form>
      <div class="card">
        <div class="field grid">
            <!--p:outputLabel for="amount" styleClass="col-fixed" style="width:100px" value="Amount" /-->
            <h5>Amount</h5>
            <div class="col">
                <InputText id="amount" type="number" v-model="enteredAmount" />
            </div>
        </div>
        <div class="field grid">
            <!--p:outputLabel for="currency" styleClass="col-fixed" style="width:100px" value="Currency" /-->
            <h5>Currency</h5>
            <div class="col">
                <Dropdown v-model="selectedCurrency" :options="currencies" optionLabel="label" placeholder="Select a Currency" />
            </div>
        </div>

        <Button type="submit" @click="postDemand"> Submit </Button>
    </div>

    </h:form>
    </div>
  </div>
</template>

<script lang="ts">
import { useToast } from "primevue/usetoast";
import { useSolidSession } from "@/composables/useSolidSession";
import { createResource, getResource, postResource } from "@/lib/solidRequests";
import { computed, defineComponent, ref, toRefs, watch } from "vue";
import router from "@/router";
import { useSolidProfile } from "@/composables/useSolidProfile";

export default defineComponent({
  name: "Home",
  components: { },
  setup(props, context) {
    const toast = useToast();
    const { authFetch, sessionInfo } = useSolidSession();
    const { isLoggedIn, webId } = toRefs(sessionInfo);
    //const amount = ref(23.43);
    //const currency = ref("EUR");

    const selectedCurrency = ref()
    const enteredAmount = ref(0)
    const currencies = [
        { label: "EUR", value: "EUR" },
        { label: "USD", value: "USD" }
    ];

    const postDemand = async () => {
      const { storage } = useSolidProfile()
      const createDataProcessed = await createResource(storage.value + "data-processed/", "", authFetch.value);
      const dataProcessed = createDataProcessed.headers.get('Location') || "ERROR";
      const createDataRequest = await createResource(storage.value + "data-requests/", "<> <http://example.org/vocab/datev/credit#dataProcessedContainer> <" + dataProcessed + "> .", authFetch.value);
      const dataRequest = createDataRequest.headers.get('Location') || "ERROR";

      const payload = `\
@prefix schema: <http://schema.org/> .
@prefix : <http://example.org/vocab/datev/credit#> .

<> a schema:Demand ;
  :hasDataRequestContainer <${dataRequest}> ;
  :hasDataProcessedContainer <${dataProcessed}> ;
  schema:itemOffered [
    a schema:LoanOrCredit ;
      schema:amount ${enteredAmount.value} ;
      schema:currency "${selectedCurrency.value.value}"
  ] .

<${webId?.value}> schema:seeks <> .
`

      await createResource("https://bank.solid.aifb.kit.edu/credits/demands/", payload, authFetch.value)
        .catch((err) => {
          toast.add({
            severity: "error",
            summary: "Error on fetch!",
            detail: err,
            life: 5000,
          });
          throw new Error(err);
        })
        .then((resp) => resp.text()); //;
    };

    return {
      postDemand,
      isLoggedIn,
      enteredAmount,
      selectedCurrency,
      currencies
    };
  },
});
</script>

<style  scoped>
.grid {
  margin: 5px;
}
.p-inputgroup {
  padding-bottom: 0px;
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
  padding: 0px 9px 0px 9px;
  transform: translate(0, -1px);
}
.p-progressbar {
  height: 2px;
  padding-top: 0px;
  border-top-right-radius: 0;
  border-top-left-radius: 0;
}
</style>