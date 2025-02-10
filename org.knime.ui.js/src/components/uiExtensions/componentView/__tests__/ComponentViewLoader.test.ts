import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
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

  const props = {
    projectId: "projectId",
  };

  const doMount = async () => {
    const TestComponent = {
      template: `
        <Suspense>
          <ComponentViewLoader :projectId="projectId" />
        </Suspense>
      `,
      components: { ComponentViewLoader },
      props,
    };

    const wrapper = mount(TestComponent, {
      props,
      global: {
        stubs: {
          PageBuilder: {
            template: '<div data-test="page-builder-stub"></div>',
          },
        },
      },
    });

    await nextTick();

    return { wrapper };
  };

  it("should mount componentView and initialize PageBuilder", async () => {
    await doMount();
    expect(pageBuilderMountMock).toHaveBeenCalled();
  });
});
