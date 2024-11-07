import {useCache} from "@shared/composables";
import router from ".";

export default async function onResult(
  accessRequestUri: string,
  result: string
) {
  const appMemory = useCache();
  appMemory[accessRequestUri] = result;
  router.push({ name: "demands" });
}
