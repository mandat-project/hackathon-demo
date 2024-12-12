"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useIsLoggedIn = void 0;
const useSolidProfile_1 = require("./useSolidProfile");
const useSolidSession_1 = require("./useSolidSession");
const vue_1 = require("vue");
const useIsLoggedIn = () => {
    const { session } = (0, useSolidSession_1.useSolidSession)();
    const { memberOf } = (0, useSolidProfile_1.useSolidProfile)();
    const isLoggedIn = (0, vue_1.computed)(() => {
        return (!!((session.webId && !memberOf) || (session.webId && memberOf && session.rdp)));
    });
    return { isLoggedIn };
};
exports.useIsLoggedIn = useIsLoggedIn;
