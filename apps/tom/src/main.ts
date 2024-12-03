import {setupApp} from "hackathon-demo/libs/utils";
import {createApp} from "vue";
import App from "./App.vue";
import router from "./router";

import "./registerServiceWorker"; // service-worker

import "primeflex/primeflex.css";
import "hackathon-demo/libs/theme/theme.css";
import "primeicons/primeicons.css";
const app = createApp(App);
setupApp(app, router);
app.mount("#app");
