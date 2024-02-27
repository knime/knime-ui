import { vi } from "vitest";
import { createApp, h } from "vue";

export const mockDynamicImport: any = () => {
  const dynamicImportMock = vi.fn();

  // mock a simple dynamic view
  dynamicImportMock.mockReturnValue({
    default: (shadowRoot: ShadowRoot) => {
      const holder = document.createElement("div");
      const app = createApp({
        render() {
          return h("div", { class: "mock-component" });
        },
      });
      app.mount(holder);
      shadowRoot.appendChild(holder);
      return { teardown: () => {} };
    },
  });

  return dynamicImportMock;
};
