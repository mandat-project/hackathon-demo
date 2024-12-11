import {setupApp} from "@datev-research/mandat-shared-utils";
import {createApp} from "vue";
import App from "./App.vue";
import router from "./router";

import "./registerServiceWorker"; // service-worker

import "primeflex/primeflex.css";
import "@datev-research/mandat-shared-theme/theme.css";
import "primeicons/primeicons.css";
const app = createApp(App);
setupApp(app, router);
app.mount("#app");
