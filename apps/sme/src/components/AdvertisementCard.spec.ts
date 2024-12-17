import { mount } from '@vue/test-utils';
import PrimeVue from "primevue/config";
import ConfirmationService from "primevue/confirmationservice";
import ToastService from "primevue/toastservice";
import AdvertisementCard from "./AdvertisementCard.vue";
import Chip from "primevue/chip";

// TODO setupTestMount
// - add plugins
// - add component stubs or real ones

const primeVueComponentStubs = {
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
};
const primeVuePlugins = [PrimeVue, ToastService, ConfirmationService];
const defaultMountGlobalOptions = {
    plugins: primeVuePlugins,
    stubs: primeVueComponentStubs
};
const defaultMountOptions = {
    global: defaultMountGlobalOptions,
}

describe('AdvertisementCard', () => {
    it('should render AdvertisementCard', async () => {
        const wrapper = mount(AdvertisementCard, {
            ...defaultMountOptions,
            props: { ad: 'https://some-url.com'},
        });
        expect(wrapper.exists()).toBe(true);
    })
});
