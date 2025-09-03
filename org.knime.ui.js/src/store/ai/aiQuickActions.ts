import { defineStore } from "pinia";

export const useAiQuickActionsStore = defineStore("aiQuickActions", () => {
  async function generateAnnotation() {
    // TODO
    return null;
  }

  return {
    generateAnnotation,
  };
});
