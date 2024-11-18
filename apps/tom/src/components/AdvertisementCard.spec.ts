import { mount } from '@vue/test-utils';
import PrimeVue from "primevue/config";
import ConfirmationService from "primevue/confirmationservice";
import ToastService from "primevue/toastservice";
import AdvertisementCard from "./AdvertisementCard.vue";

describe('AdvertisementCard', () => {
    it('should render AdvertisementCard', async () => {
        const wrapper = mount(AdvertisementCard, {
            props: { ad: 'https://some-url.com'},
            global:{
                plugins: [PrimeVue, ToastService, ConfirmationService],
                components: {
                    Button: { render: () => '' },
                    Card: { render: () => '' },
                    Checkbox: { render: () => '' },
                    Chip: { render: () => '' },
                    Chips: { render: () => '' },
                    ConfirmDialog: { render: () => '' },
                    ContextMenu: { render: () => '' },
                    Dialog: { render: () => '' },
                    Divider: { render: () => '' },
                    Dropdown: { render: () => '' },
                    InputNumber: { render: () => '' },
                    InputSwitch: { render: () => '' },
                    InputText: { render: () => '' },
                    Listbox: { render: () => '' },
                    Menu: { render: () => '' },
                    Message: { render: () => '' },
                    Panel: { render: () => '' },
                    ProgressBar: { render: () => '' },
                    RadioButton: { render: () => '' },
                    SelectButton: { render: () => '' },
                    Skeleton: { render: () => '' },
                    SpeedDial: { render: () => '' },
                    Stepper: { render: () => '' },
                    StepperPanel: { render: () => '' },
                    TabMenu: { render: () => '' },
                    Textarea: { render: () => '' },
                    Toast: { render: () => '' },
                    Toolbar: { render: () => '' },
                    Tooltip: { render: () => '' },
                }
            },
        });
        expect(wrapper.exists()).toBe(true);
    })
});
