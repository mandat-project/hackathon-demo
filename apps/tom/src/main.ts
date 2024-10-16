import {createApp} from "vue";
import {requireStyles, setupApp} from "@shared/utils";
import App from "./App.vue";
import router from "./router";

import "./registerServiceWorker"; // service-worker

requireStyles();
const app = createApp(App);
setupApp(app, router);
app.mount("#app");
