import Avatar from "primevue/avatar";
import BadgeDirective from "primevue/badgedirective";
import Button from "primevue/button";
import Card from "primevue/card";
import Checkbox from "primevue/checkbox";
import Chips from "primevue/chips";
import PrimeVue from "primevue/config";
import ConfirmationService from "primevue/confirmationservice";
import ConfirmDialog from "primevue/confirmdialog";
import ContextMenu from "primevue/contextmenu";
import Dialog from "primevue/dialog";
import Divider from "primevue/divider";
import Dropdown from "primevue/dropdown";
import InputSwitch from "primevue/inputswitch";
import InputText from "primevue/inputtext";
import Listbox from "primevue/listbox";
import Menu from "primevue/menu";
import ProgressBar from "primevue/progressbar";
import RadioButton from "primevue/radiobutton";
import SpeedDial from "primevue/speeddial";
import TabMenu from "primevue/tabmenu";
import Textarea from "primevue/textarea";
import Toast from "primevue/toast";
import ToastService from "primevue/toastservice";
import Toolbar from "primevue/toolbar";
import Tooltip from "primevue/tooltip";
import {App} from "vue";
import {Router} from "vue-router";

export const setupApp = (app: App<Element>, router?: Router): void => {
    if (router) { app.use(router); }

    app.use(PrimeVue, {ripple: true});
    app.use(ToastService);
    app.use(ConfirmationService);

    app.component("Button", Button);
    app.component("Toolbar", Toolbar);
    app.component("Avatar", Avatar);
    app.component("Card", Card);
    app.component("Checkbox", Checkbox);
    app.component("Chips", Chips);
    app.component("InputSwitch", InputSwitch)
    app.component("InputText", InputText);
    app.component("RadioButton", RadioButton)
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
}
