import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import Home from "@/views/Home.vue";
import AccessRequestView from "@/views/AccessRequestView.vue";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "Home",
    component: Home,
  },
  {
    path: "/accessRequest",
    name: "AccessRequestView",
    component: AccessRequestView,
    props: (route) => ({
      uri: route.query.uri,
      redirect: route.query.redirect,
    }),
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
