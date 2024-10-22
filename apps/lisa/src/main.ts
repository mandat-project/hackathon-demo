import {createApp} from "vue";
import {requireStyles, setupApp} from "@shared/utils";
import App from "./App.vue";
import "./registerServiceWorker";
import router from "./router";

requireStyles();
const app = createApp(App);
setupApp(app, router);
app.mount("#app");
