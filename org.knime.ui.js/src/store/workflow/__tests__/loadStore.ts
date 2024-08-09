import { mockVuexStore } from "@/test/utils";

export const loadStore = async () => {
  const store = mockVuexStore({
    workflow: await import("@/store/workflow"),
    selection: await import("@/store/selection"),
    canvas: {
      getters: {
        getVisibleFrame() {
          return () => ({
            left: -500,
            top: -500,
            width: 1000,
            height: 1000,
          });
        },
      },
    },
    aiAssistant: { state: { build: { isProcessing: false } } },
    application: await import("@/store/application"),
    uiControls: await import("@/store/uiControls"),
  });

  return { store };
};
