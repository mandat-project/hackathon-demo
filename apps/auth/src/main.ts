import {requireStyles, setupApp} from "@shared/utils";
import {createApp} from "vue";
import App from "./App.vue";
import router from "./router";
import {requireAuthAppStyles} from "./utils/requireAuthAppStyles";
import {createI18n} from "vue-i18n";
import en from "./assets/i18n/en.json";
import de from "./assets/i18n/de.json";

requireStyles('dackl-like');
requireAuthAppStyles();

requireStyles();
export const i18n = createI18n({
  locale: 'en',
  messages: {
    en: en,
    de: de
  }
})
const app = createApp(App);
setupApp(app, router);
app.use(i18n);
app.mount("#app");
