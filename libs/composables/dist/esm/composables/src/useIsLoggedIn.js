import { useSolidProfile } from "./useSolidProfile";
import { useSolidSession } from "./useSolidSession";
import { computed } from "vue";
export const useIsLoggedIn = () => {
    const { session } = useSolidSession();
    const { memberOf } = useSolidProfile();
    const isLoggedIn = computed(() => {
        return (!!((session.webId && !memberOf) || (session.webId && memberOf && session.rdp)));
    });
    return { isLoggedIn };
};
