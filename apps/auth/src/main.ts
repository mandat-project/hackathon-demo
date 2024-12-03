import { setupApp } from "hackathon-demo/libs/utils";
import { createApp } from "vue";
import { createI18n } from "vue-i18n";
import App from "./App.vue";
import de from "./assets/i18n/de.json";
import en from "./assets/i18n/en.json";
import router from "./router";

import "primeflex/primeflex.css";
import "hackathon-demo/libs/theme/theme.css";
// import "@/libs/theme/dist/theme.css";
import "primeicons/primeicons.css";
import "@/assets/styles.scss";

export const i18n = createI18n({
  locale: "en",
  messages: {
    en: en,
    de: de,
  },
});
const app = createApp(App);
setupApp(app, router);
app.use(i18n);
app.mount("#app");
