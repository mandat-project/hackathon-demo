import {shallowMount} from '@vue/test-utils';
import StatusChip from "@/components/StatusChip.vue";
import Chip from "primevue/chip";
import {STATES} from "@/enums/states";

describe('StatusChip.vue', () => {
    it.each`
  status                                 | labelText
  ${STATES.DataNeeded}                   | ${'Data needed'}
  ${STATES.Terminated}                   | ${'Terminated'}
  ${STATES.OfferAccepted}                | ${'Offer Accepted'}
  ${STATES.DataSuccessfullyProvided}     | ${'Data successfully provided'}
  ${STATES.PendingDataRequest}           | ${'Pending Data Request'}
  ${STATES.WaitingForResponse}           | ${'Waiting for response'}

`('$status chip has label text "$labelText"', ({ status, labelText }) => {
        const wrapper = shallowMount(StatusChip,{
            global: {
                components: {
                    'Chip': Chip
                }
            },
            props:{
                status: status
            }
        });
        const chip = wrapper.find('chip-stub');
        expect(chip.attributes().label).toMatch(labelText);
    });
});