import Accordion from 'primevue/accordion';
import AccordionTab from "primevue/accordiontab";
import Avatar from "primevue/avatar";
import BadgeDirective from "primevue/badgedirective";
import Button from "primevue/button";
import Card from "primevue/card";
import Checkbox from "primevue/checkbox";
import Chip from "primevue/chip";
import Chips from "primevue/chips";
import PrimeVue from "primevue/config";
import ConfirmationService from "primevue/confirmationservice";
import ConfirmDialog from "primevue/confirmdialog";
import ContextMenu from "primevue/contextmenu";
import Dialog from "primevue/dialog";
import Divider from "primevue/divider";
import Dropdown from "primevue/dropdown";
import InputNumber from "primevue/inputnumber";
import InputSwitch from "primevue/inputswitch";
import InputText from "primevue/inputtext";
import Listbox from "primevue/listbox";
import Menu from "primevue/menu";
import Message from "primevue/message";
import Panel from "primevue/panel";
import ProgressBar from "primevue/progressbar";
import RadioButton from "primevue/radiobutton";
import Skeleton from "primevue/skeleton";
import SpeedDial from "primevue/speeddial";
import Stepper from "primevue/stepper";
import StepperPanel from "primevue/stepperpanel";
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
    app.component("Chip", Chip);
    app.component("InputSwitch", InputSwitch)
    app.component("InputText", InputText);
    app.component("InputNumber", InputNumber);
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
    app.component("Panel", Panel);
    app.component("Message", Message);
    app.component("StepperPanel", StepperPanel);
    app.component("Stepper", Stepper);
    app.component("Skeleton", Skeleton);
    app.component("Accordion", Accordion);
    app.component("AccordionTab", AccordionTab);

    app.directive('badge', BadgeDirective);
    app.directive("tooltip", Tooltip);
}
