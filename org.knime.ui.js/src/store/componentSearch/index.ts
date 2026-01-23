import { defineStore } from "pinia";

import { useComponentSearch } from "./useComponentSearch";

export const useSidebarComponentSearchStore = defineStore(
  "sidebarComponentSearch",
  () => {
    return useComponentSearch();
  },
);

export const useQuickActionComponentSearchStore = defineStore(
  "quickActionComponentSearch",
  () => {
    return useComponentSearch();
  },
);
