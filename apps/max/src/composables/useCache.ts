import { reactive } from "vue";

const cache: Record<string, string> = {}

export const useCache = () => cache;
