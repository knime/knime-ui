import type { RootStoreState } from "@/store/types";
import { useStore as _useStore } from "vuex";

export const useStore = () => {
  return _useStore<RootStoreState>();
};
