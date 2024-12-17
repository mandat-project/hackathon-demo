import {createRouter, createWebHistory, RouteRecordRaw} from "vue-router";
import Home from "@/views/Home.vue";
import Inbox from "@/views/Inbox.vue";

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
];

const router = createRouter({
    history: createWebHistory(process.env.BASE_URL),
    routes,
});

export default router;
