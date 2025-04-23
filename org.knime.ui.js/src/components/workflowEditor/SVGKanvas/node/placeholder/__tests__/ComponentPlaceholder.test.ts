import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, shallowMount } from "@vue/test-utils";

import { ComponentPlaceholder as ComponentPlaceholderType } from "@/api/gateway-api/generated-api";
import { getToastsProvider } from "@/plugins/toasts";
import {
  createComponentPlaceholder,
  createConnection,
  createWorkflow,
  createWorkflowAnnotation,
} from "@/test/factories";
import { mockedObject } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import NodeSelectionPlane from "../../NodeSelectionPlane.vue";
import ComponentPlaceholder from "../ComponentPlaceholder.vue";

const defaultProps = { placeholder: createComponentPlaceholder() };

describe("ComponentPlaceholder", () => {
  const toast = mockedObject(getToastsProvider());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const testNodeId = "root:1";
  const testAnnotationId = "annotationId";
  const testComponentId = "componentId";
  const testConnectionId = "connectionId";

  const doMount = (props = {}) => {
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
      mockedStores,
    };
  };

  it("should show error toast if the state is ERROR", async () => {
    const { wrapper } = doMount();

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

    expect(toast.show).toHaveBeenCalledWith({
      headline: placeholderData.message,
      message: placeholderData.details,
      type: "error",
      autoRemove: false,
    });
  });

  it("should show warning toast if the state is SUCCESSWITHWARNING", async () => {
    const { wrapper } = doMount();

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

    expect(toast.show).toHaveBeenCalledWith({
      headline: placeholderData.message,
      message: placeholderData.details,
      type: "warning",
      autoRemove: true,
    });
  });

  it("should select the loaded component if selection state hasnt changed and state of placeholder is SUCCESS", async () => {
    const { wrapper, mockedStores } = doMount();

    // @ts-expect-error
    mockedStores.selectionStore.getSelectedComponentPlaceholder = {
      id: defaultProps.placeholder.id,
    };
    await nextTick();

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

  it("should show selection if component placeholder is selected", async () => {
    const { wrapper, mockedStores } = doMount();

    expect(
      wrapper.findComponent(NodeSelectionPlane).attributes("style"),
    ).toContain("display: none");

    // @ts-expect-error
    mockedStores.selectionStore.getSelectedComponentPlaceholder = {
      id: defaultProps.placeholder.id,
    };
    await nextTick();

    expect(
      wrapper.findComponent(NodeSelectionPlane).attributes("style"),
    ).not.toContain("display: none");
  });
});
