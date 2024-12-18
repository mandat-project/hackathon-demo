import {mount} from '@vue/test-utils'
import DemandProcessor from "@/components/DemandProcessor.vue";
import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";
import ConfirmationService from "primevue/confirmationservice";

jest.mock('highlight.js/styles/stackoverflow-light.css', () => 'mocked-check-icon-path');
describe('DemandProcessor.vue', () => {
  it('should render DemandProcessor', async() => {
    const wrapper = mount(DemandProcessor, {
      props: { demandUri: 'https://test-url.com', demandState:'Demands' },
      global:{
        plugins: [PrimeVue, ToastService, ConfirmationService],
        stubs: {
          Button: true,
          Card: true,
          Dialog: true,
          Dropdown: true,
          InputNumber: true,
          InputSwitch: true,
          InputText: true,
          ProgressBar: true,
          Skeleton: true,
          Toast: true,
          Tooltip: true,
        }
      }
    })
    expect(wrapper.exists()).toBe(true);
  })
})
