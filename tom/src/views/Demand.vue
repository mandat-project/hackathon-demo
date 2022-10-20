<script>
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';

import { ref } from 'vue';

export default {
  data() {
    return {
      selectedCurrency: null,
      enteredAmount: null,
      currencies: [ 
        {label: 'EUR', value: 'EUR'},
        {label: 'USD', value: 'USD'},
      ]
    }
  },
  methods: {
    handleSubmit() {
        console.log(ref)
      alert('go')
    }
  }
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

        <Button type="submit"> Submit </Button>
    </div>

    </h:form>
    </div>  
</template>
  