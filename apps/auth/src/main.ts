import {requireStyles, setupApp} from "@shared/utils";
import {createApp} from "vue";
import App from "./App.vue";
import router from "./router";
import {requireAuthAppStyles} from "./utils/requireAuthAppStyles";

requireStyles('dackl-like');
requireAuthAppStyles();

requireStyles();

const app = createApp(App);
setupApp(app, router);
app.mount("#app");
