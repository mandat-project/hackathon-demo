import de from "@/assets/i18n/de.json";
import en from "@/assets/i18n/en.json";
import router from "@/router";
import Home from "@/views/Home.vue";
import { mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import ConfirmationService from "primevue/confirmationservice";
import ToastService from "primevue/toastservice";
import { createI18n } from "vue-i18n";

const rdpCapableSessionMock = {
  authFetch: jest.fn(() =>
    Promise.resolve({
      status: 200,
      data: "",
      statusText: "OK",
      headers: {},
      config: {},
      request: {},
    })
  ),
  updateSessionWithRDP: jest.fn(),
  login: jest.fn(() => Promise.resolve(undefined)),
  logout: jest.fn(),
  handleRedirectFromLogin: jest.fn(() => Promise.resolve(undefined)),
  rdp: "",
  isActive: true,
};
const primeVueStubs = {
  Toolbar: true,
  Avatar: true,
  AccessRequestCallback: true,
  Button: true,
  Card: true,
  Skeleton: true,
};
test("Home should render 401 by default", async () => {
  const i18n = createI18n({
    locale: "en",
    messages: {
      en: en,
      de: de,
    },
  });
  const wrapper = mount(Home, {
    global: {
      plugins: [PrimeVue, ToastService, ConfirmationService, router, i18n],
      provide: {
        "useSolidSession:RdpCapableSession": rdpCapableSessionMock,
      },
      stubs: primeVueStubs,
    },
  });

  expect(wrapper.text()).toMatch("Access Manager");
});
