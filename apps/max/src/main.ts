import {createApp} from "vue";
import App from "./App.vue";
import "./registerServiceWorker";
import router from "./router";
import PrimeVue from "primevue/config";
import Button from "primevue/button";
import Toolbar from "primevue/toolbar";
import Avatar from "primevue/avatar";
import Card from "primevue/card";
import Checkbox from 'primevue/checkbox';
import Chips from 'primevue/chips';
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import Dialog from "primevue/dialog";
import Dropdown from 'primevue/dropdown';
import SpeedDial from "primevue/speeddial";
import Toast from "primevue/toast";
import ProgressBar from "primevue/progressbar";
import Listbox from "primevue/listbox";
import TabMenu from "primevue/tabmenu";
import ContextMenu from 'primevue/contextmenu';
import Menu from 'primevue/menu';
import Divider from "primevue/divider";
import BadgeDirective from 'primevue/badgedirective';
import Tooltip from "primevue/tooltip";
import ToastService from "primevue/toastservice";
import ConfirmDialog from 'primevue/confirmdialog';
import ConfirmationService from 'primevue/confirmationservice';
import RadioButton from "primevue/radiobutton";
import InputSwitch from "primevue/inputswitch"; // icons

import "primeflex/primeflex.css"; // layouts
import "primevue/resources/themes/vela-blue/theme.css"; // theme
import "primevue/resources/primevue.min.css"; // core css
import "primeicons/primeicons.css";


const app = createApp(App);

app.use(router);
app.use(PrimeVue, {ripple: true});
app.use(ToastService);
app.use(ConfirmationService);

app.component("Button", Button);
app.component("Toolbar", Toolbar);
app.component("Avatar", Avatar);
app.component("Card", Card);
app.component("Checkbox", Checkbox);
app.component("Chips", Chips);
app.component("InputSwitch", InputSwitch);
app.component("InputText", InputText);
app.component("RadioButton", RadioButton);
app.component("Textarea", Textarea);
app.component("Dialog", Dialog);
app.component("Dropdown", Dropdown);
app.component("SpeedDial", SpeedDial);
app.component("Toast", Toast);
app.component("ProgressBar", ProgressBar);
app.component("Listbox", Listbox);
app.component("TabMenu", TabMenu);
app.component("ContextMenu", ContextMenu);
app.component("ConfirmDialog", ConfirmDialog);
app.component("Menu", Menu);
app.component("Divider", Divider);

app.directive('badge', BadgeDirective);
app.directive("tooltip", Tooltip);

app.mount("#app");
