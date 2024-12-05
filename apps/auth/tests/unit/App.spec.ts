import App from "@/App.vue";
import router from "@/router";
import { mount, shallowMount } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import ConfirmationService from "primevue/confirmationservice";
import ToastService from "primevue/toastservice";

jest.mock("hackathon-demo/libs/components", () => ({}));

test("App should render 401 by default", async () => {
  const wrapper = mount(App, {
    global: {
      plugins: [PrimeVue, ToastService, ConfirmationService, router],
      mocks: {
        $t: (key: string): string => key,
      },
    },
  });
  expect(wrapper.text()).toMatch(`error.401-unauthenticated`);
});
