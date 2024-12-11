import CreateDemand from "@/views/CreateDemand.vue";
import Demands from "@/views/Demands.vue";
import {AccessRequestCallback} from "@datev-research/mandat-shared-components";
import {createRouter, createWebHistory, RouteRecordRaw} from "vue-router";
import onResult from "./accessRequestHandledCallback";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    redirect: '/demands',
  },
  {
    path: "/create-demand",
    name: "create-demand",
    component: CreateDemand,
  },
  {
    path: "/demands",
    name: "demands",
    component: Demands,
    props: {
      type: 'pending'
    }
  },
  {
    path: "/services",
    name: "services",
    component: Demands,
      props: {
      type: 'active'
    }
  },
  {
    path: "/accessRequestHandled",
    name: "AccessRequestHandled",
    component: AccessRequestCallback,
    props: ({query: { uri, result }}) => ({
      uri: uri,
      result: result,
      onResult
    }),
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
