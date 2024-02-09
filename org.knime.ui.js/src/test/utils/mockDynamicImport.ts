import { vi } from "vitest";
import { createApp, h } from "vue";

const dynamicImportMock = vi.fn();

export const mockDynamicImport: any = () => {
  vi.mock("webapps-common/ui/uiExtensions/useDynamicImport", () => ({
    useDynamicImport: vi.fn().mockImplementation(() => {
      return { dynamicImport: dynamicImportMock };
    }),
  }));

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
