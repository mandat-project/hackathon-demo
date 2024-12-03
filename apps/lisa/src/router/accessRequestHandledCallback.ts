import { useCache } from "hackathon-demo/libs/composables";
import router from ".";

export default function onResult(
  accessRequestUri: string,
  result: string,
  appMemory = useCache()
) {
  appMemory[accessRequestUri] = result;
  router.push({ name: "Home" });
}
