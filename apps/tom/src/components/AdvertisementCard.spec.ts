import { mount } from '@vue/test-utils';
import PrimeVue from "primevue/config";
import ConfirmationService from "primevue/confirmationservice";
import ToastService from "primevue/toastservice";
import AdvertisementCard from "./AdvertisementCard.vue";

// TODO setupTestMount
// - add plugins
// - add component stubs or real ones


describe('AdvertisementCard', () => {
    it('should render AdvertisementCard', async () => {
        const wrapper = mount(AdvertisementCard, {
            props: { ad: 'https://some-url.com'},
            global:{
                plugins: [PrimeVue, ToastService, ConfirmationService],
                stubs: {
                    Button: true,
                    Card: true,
                    Checkbox: true,
                    Chip: true,
                    Chips: true,
                    ConfirmDialog: true,
                    ContextMenu: true,
                    Dialog: true,
                    Divider: true,
                    Dropdown: true,
                    InputNumber: true,
                    InputSwitch: true,
                    InputText: true,
                    Listbox: true,
                    Menu: true,
                    Message: true,
                    Panel: true,
                    ProgressBar: true,
                    RadioButton: true,
                    SelectButton: true,
                    Skeleton: true,
                    SpeedDial: true,
                    Stepper: true,
                    StepperPanel: true,
                    TabMenu: true,
                    Textarea: true,
                    Toast: true,
                    Toolbar: true,
                    Tooltip: true,
                }
            },
        });
        expect(wrapper.exists()).toBe(true);
    })
});
