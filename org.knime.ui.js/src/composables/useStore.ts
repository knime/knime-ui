import { useStore as _useStore } from "vuex";

import type { RootStoreState } from "@/store/types";

export const useStore = () => {
  return _useStore<RootStoreState>();
};
