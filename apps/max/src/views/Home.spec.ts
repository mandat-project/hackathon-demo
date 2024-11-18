
global.TextEncoder = class {} as any;
global.TextDecoder = class {} as any;
global.Notification = class {} as any;
(global.navigator as any).serviceWorker =  { addEventListener: jest.fn() } as any;

import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";
import ConfirmationService from "primevue/confirmationservice";

import {mount} from "@vue/test-utils";
import Home from "./Home.vue";

describe('Home Page', () => {
  it('should render', () => {
    const result = mount(Home, {
      global:{
        plugins: [PrimeVue, ToastService, ConfirmationService]
      },
    });
    expect(result.exists()).toBe(true);
  });
});
