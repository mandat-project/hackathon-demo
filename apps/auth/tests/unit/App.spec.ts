import App from "@/App.vue";
import router from "@/router";
import { mount, shallowMount } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import ConfirmationService from "primevue/confirmationservice";
import ToastService from "primevue/toastservice";

jest.mock("@datev-research/mandat-shared-components", () => ({}));

test("App should render", async () => {
  const wrapper = mount(App, {
    global: {
      plugins: [PrimeVue, ToastService, ConfirmationService, router],

      mocks: {
        $t: (key: string): string => key,
      },
    },
  });
  expect(wrapper.exists()).toBe(true);
});
