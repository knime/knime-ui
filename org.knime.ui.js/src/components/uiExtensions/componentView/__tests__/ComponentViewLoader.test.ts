import { afterEach, describe, expect, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";
import { createStore } from "vuex";

import ComponentViewLoader from "@/components/uiExtensions/componentView/ComponentViewLoader.vue";

const pageBuilderMountMock = vi.hoisted(() => vi.fn());

const mockPagebuilderStore = createStore({
  modules: {
    api: {
      namespaced: true,
      actions: {
        mount: pageBuilderMountMock,
      },
    },
  },
});

vi.mock("vuex", async () => {
  const actual = await vi.importActual("vuex");
  return {
    ...actual,
    useStore: vi.fn(() => mockPagebuilderStore),
  };
});

describe("ComponentViewLoader.vue", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const doMount = () => {
    const wrapper = shallowMount(ComponentViewLoader, {
      global: {
        stubs: {
          PageBuilder: {
            template: '<div data-test="page-builder-stub"></div>',
            props: ["projectId", "workflowId", "selectedNode", "timestamp"],
          },
        },
      },
    });

    return { wrapper };
  };

  it("should mount componentView and initialize PageBuilder", () => {
    doMount();
    expect(pageBuilderMountMock).toHaveBeenCalled();
  });
});
