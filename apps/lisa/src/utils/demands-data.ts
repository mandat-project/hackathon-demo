import {computed, Ref, ref} from "vue";
import {TAB_STATE} from "@/enums/tabsState";
import {Demand} from "@/types/Demand";

const currentDemands:Ref<Demand[]> = ref([]);
const oldDemands:Ref<Demand[]> = ref([]);

export const isActiveLoanTabEmpty = computed(()=> !currentDemands.value.some((item) => item.tab === TAB_STATE.OfferAccepted));
export const isDemandTabEmpty = computed(()=> !currentDemands.value.some((item) => item.tab === TAB_STATE.Demands));
export const isTerminatedTabEmpty = computed(()=> !currentDemands.value.some((item) => item.tab === TAB_STATE.Terminated));

export function storeDemands(demand:Demand) {
    const isDemandExists = currentDemands.value.some((item) => item.id === demand.id);
    const isDemandExistsOldDemands = oldDemands.value.some((item) => item.id === demand.id);
    if(!isDemandExists){
        currentDemands.value.push(demand);
    }
    if(!isDemandExistsOldDemands){
        oldDemands.value.push(demand);
    }
}