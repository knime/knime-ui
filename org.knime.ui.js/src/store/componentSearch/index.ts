import { ref } from "vue";
import { defineStore } from "pinia";

import type { ComponentNodeTemplateWithExtendedPorts } from "@/util/data-mappers";

import { useComponentSearch } from "./useComponentSearch";

export const useSidebarComponentSearchStore = defineStore(
  "sidebarComponentSearch",
  () => {
    const activeDescription =
      ref<ComponentNodeTemplateWithExtendedPorts | null>(null);

    return { activeDescription, ...useComponentSearch() };
  },
);

export const useQuickActionComponentSearchStore = defineStore(
  "quickActionComponentSearch",
  () => {
    return useComponentSearch();
  },
);
