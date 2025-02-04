import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { createStore } from "vuex";

import { NodeState } from "@/api/gateway-api/generated-api.ts";
import ComponentViewLoader from "@/components/uiExtensions/componentView/ComponentViewLoader.vue";

const pageBuilderMountMock = vi.hoisted(() => vi.fn());

// mocks the initialization of the pagebuilder store, see pageBuilderLoader.ts
const mockPagebuilderStore = createStore({
  modules: {
    api: {
      namespaced: true,
      actions: {
        mount: pageBuilderMountMock,
      },
    },
    pagebuilder: {
      namespaced: true,
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

  const doMount = async (
    executionState = NodeState.ExecutionStateEnum.EXECUTED,
  ) => {
    const props = {
      projectId: "project",
      workflowId: "workflow",
      nodeId: "node",
      executionState,
    };

    const TestComponent = {
      template: `
        <Suspense>
          <ComponentViewLoader
            v-bind="$props"
          />
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

  it("should mount componentView and initialize PageBuilder when node is executed", async () => {
    const { wrapper } = await doMount(NodeState.ExecutionStateEnum.CONFIGURED);
    expect(pageBuilderMountMock).not.toHaveBeenCalled();

    await wrapper.setProps({
      executionState: NodeState.ExecutionStateEnum.EXECUTED,
    });
    await nextTick();
    expect(pageBuilderMountMock).toHaveBeenCalled();
  });
});
