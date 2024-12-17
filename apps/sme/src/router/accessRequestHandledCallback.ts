import router from "@/router";
import {useCache} from "@datev-research/mandat-shared-composables";

export default function onResult(
  accessRequestUri: string,
  result: string,
  appMemory = useCache()
) {
  appMemory[accessRequestUri] = result;
  router.push({ name: "demands" });
}
