import {createRouter, createWebHistory, RouteRecordRaw} from "vue-router";
import Home from "@/views/Home.vue";
import Inbox from "@/views/Inbox.vue";
import { AccessRequestCallback } from "hackathon-demo/libs/components";
import onResult from "./accessRequestHandledCallback";

const routes: Array<RouteRecordRaw> = [
    {
        path: "/",
        name: "Home",
        component: Home,
    },
    {
        path: "/inbox/",
        name: "Inbox",
        component: Inbox,
    },
    {
        path: "/accessRequestHandled",
        name: "AccessRequestHandled",
        component: AccessRequestCallback,
        props: (route) => ({
          uri: route.query.uri,
          result: route.query.result,
          onResult: onResult
        }),
      },
];

const router = createRouter({
    history: createWebHistory(process.env.BASE_URL),
    routes,
});

export default router;
