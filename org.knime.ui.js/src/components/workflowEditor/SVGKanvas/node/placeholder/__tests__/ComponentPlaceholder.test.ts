import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, shallowMount } from "@vue/test-utils";

import { ComponentPlaceholder as ComponentPlaceholderType } from "@/api/gateway-api/generated-api";
import {
  createComponentPlaceholder,
  createConnection,
  createWorkflow,
  createWorkflowAnnotation,
} from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import { getToastPresets } from "@/toastPresets";
import ComponentPlaceholder from "../ComponentPlaceholder.vue";

describe("ComponentPlaceholder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = { placeholder: createComponentPlaceholder() };
  const testNodeId = "root:1";
  const testAnnotationId = "annotationId";
  const testComponentId = "componentId";
  const testConnectionId = "connectionId";

  const doMount = (props = {}) => {
    const { toastPresets } = getToastPresets();
    const mockedStores = mockStores();

    mockedStores.workflowStore.setActiveWorkflow(
      createWorkflow({
        nodes: {
          [testNodeId]: { id: testNodeId, position: { x: 0, y: 0 } },
        },
        connections: {
          [testConnectionId]: createConnection({ id: testConnectionId }),
        },
        workflowAnnotations: [
          createWorkflowAnnotation({
            id: testAnnotationId,
            text: { value: "Annotation text" },
          }),
        ],
      }),
    );

    const wrapper = shallowMount(ComponentPlaceholder, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [mockedStores.testingPinia],
      },
    });

    return {
      wrapper,
      toastPresets,
      mockedStores,
    };
  };

  it("should show error toast if the state is ERROR", async () => {
    const { wrapper, toastPresets } = doMount();

    const componentLoadingFailedSpy = vi.spyOn(
      toastPresets.workflow,
      "componentLoadingFailed",
    );
    const placeholderData = {
      message: "Placeholder failed loading",
      details: "No details",
    };

    await wrapper.setProps({
      placeholder: {
        ...defaultProps.placeholder,
        state: ComponentPlaceholderType.StateEnum.ERROR,
        ...placeholderData,
      },
    });

    expect(componentLoadingFailedSpy).toHaveBeenCalledWith(placeholderData);
  });

  it("should show warning toast if the state is SUCCESSWITHWARNING", async () => {
    const { wrapper, toastPresets } = doMount();

    const componentLoadedWithWarningSpy = vi.spyOn(
      toastPresets.workflow,
      "componentLoadedWithWarning",
    );
    const placeholderData = {
      message: "There are some issues",
      details: "Fix this",
    };

    await wrapper.setProps({
      placeholder: {
        ...defaultProps.placeholder,
        state: ComponentPlaceholderType.StateEnum.SUCCESSWITHWARNING,
        ...placeholderData,
      },
    });

    expect(componentLoadedWithWarningSpy).toHaveBeenCalledWith(placeholderData);
  });

  it("should select the loaded component if selection state hasnt changed and state of placeholder is SUCCESS", async () => {
    const { wrapper, mockedStores } = doMount();

    await wrapper.setProps({
      placeholder: {
        ...defaultProps.placeholder,
        componentId: testComponentId,
        state: ComponentPlaceholderType.StateEnum.SUCCESS,
      },
    });

    expect(mockedStores.selectionStore.deselectAllObjects).toBeCalledWith([
      testComponentId,
    ]);
  });

  it.each([
    {
      description: "another node",
      selectAction: (store) => store.selectNodes([testNodeId]),
    },
    {
      description: "an annotation",
      selectAction: (store) => store.selectAnnotations(testAnnotationId),
    },
    {
      description: "a connection",
      selectAction: (store) => store.selectConnections(["connectionId"]),
    },
    {
      description: "a bendpoint",
      selectAction: (store) => store.selectBendpoints(["bendPointId"]),
    },
  ])(
    "should not select the loaded component if $description was selected in the meantime",
    async ({ selectAction }) => {
      const { wrapper, mockedStores } = doMount();

      selectAction(mockedStores.selectionStore);
      await flushPromises();
      await nextTick();

      await wrapper.setProps({
        placeholder: {
          ...defaultProps.placeholder,
          componentId: testComponentId,
          state: ComponentPlaceholderType.StateEnum.SUCCESS,
        },
      });

      expect(mockedStores.selectionStore.deselectAllObjects).not.toBeCalled();
    },
  );
});
