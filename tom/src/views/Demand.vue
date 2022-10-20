<script>
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';

import { ref } from 'vue';

export default {
    setup() {
        const selectedCurrency = ref()
        const enteredAmount = ref(0)
        const currencies = [
            { label: "EUR", value: "EUR" },
            { label: "USD", value: "USD" }
        ];
        enteredAmount.value = 20;
     
        const handleSubmit= () => {
            console.log("create demand for " + enteredAmount.value + " " + selectedCurrency.value.value);
        }

        return {
            enteredAmount,
            selectedCurrency,
            currencies,
            handleSubmit
        }
    },

}
</script>

<template>
    <div>
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

        <Button type="submit" @click="handleSubmit()"> Submit </Button>
    </div>

    </h:form>
    </div>  
</template>
  