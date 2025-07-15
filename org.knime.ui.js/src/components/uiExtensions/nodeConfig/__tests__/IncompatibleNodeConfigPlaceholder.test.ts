import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { VueWrapper, mount } from "@vue/test-utils";

import { Node, NodeState } from "@/api/gateway-api/generated-api";
import DownloadAPButton from "@/components/common/DownloadAPButton.vue";
import {
  createComponentNode,
  createMetanode,
  createNativeNode,
  createWorkflow,
} from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import IncompatibleNodeConfigPlaceholder from "../IncompatibleNodeConfigPlaceholder.vue";

describe("IncompatibleNodeConfigPlaceholder.vue", () => {
  const embeddableNode = createNativeNode({
    id: "root:1",
    dialogType: Node.DialogTypeEnum.Web,
    state: { executionState: NodeState.ExecutionStateEnum.EXECUTED },
  });
  const nonEmbeddableNode = createNativeNode({
    id: "root:2",
    dialogType: Node.DialogTypeEnum.Swing,
    state: { executionState: NodeState.ExecutionStateEnum.EXECUTED },
  });
  const embeddableComponent = createComponentNode({
    id: "root:3",
    dialogType: Node.DialogTypeEnum.Web,
  });
  const nonEmbeddableComponent = createComponentNode({
    id: "root:4",
    dialogType: Node.DialogTypeEnum.Swing,
  });
  const metanode = createMetanode({ id: "root:5" });

  const doMount = () => {
    const mockedStores = mockStores();

    const workflow = createWorkflow({
      nodes: {
        [embeddableNode.id]: embeddableNode,
        [nonEmbeddableNode.id]: nonEmbeddableNode,
        [embeddableComponent.id]: embeddableComponent,
        [nonEmbeddableComponent.id]: nonEmbeddableComponent,
        [metanode.id]: metanode,
      },
    });
    mockedStores.workflowStore.setActiveWorkflow(workflow);

    const wrapper = mount(IncompatibleNodeConfigPlaceholder, {
      global: {
        plugins: [mockedStores.testingPinia],
      },
    });

    return { wrapper, mockedStores };
  };

  const assertPlaceholderText = (wrapper: VueWrapper<any>, text: string) => {
    expect(wrapper.findAll(".placeholder-text").length).toBe(1);
    expect(wrapper.find(".placeholder-text").text()).toBe(text);
  };

  it("renders placeholder when nothing is selected", () => {
    const { wrapper } = doMount();

    assertPlaceholderText(wrapper, "Select a node to show its dialog.");
  });

  it("renders placeholder for metanodes", async () => {
    const { wrapper, mockedStores } = doMount();

    await mockedStores.selectionStore.selectNodes([metanode.id]);
    await nextTick();

    assertPlaceholderText(
      wrapper,
      "Configuration is not available for metanodes.",
    );
  });

  describe("legacy nodes", () => {
    it("handles download button", async () => {
      const { wrapper, mockedStores } = doMount();

      mockedStores.uiControlsStore.shouldDisplayDownloadAPButton = true;
      await mockedStores.selectionStore.selectNodes([nonEmbeddableNode.id]);
      await nextTick();

      assertPlaceholderText(
        wrapper,
        "To configure nodes with a classic dialog, download the KNIME Analytics Platform.",
      );
      expect(wrapper.findComponent(DownloadAPButton).exists()).toBe(true);
    });

    it("renders correct placeholder when download button should not be displayed", async () => {
      const { wrapper, mockedStores } = doMount();
      await mockedStores.selectionStore.selectNodes([nonEmbeddableNode.id]);
      await nextTick();

      assertPlaceholderText(wrapper, "This node dialog is not supported here.");
      expect(
        wrapper.find('[data-test-id="open-legacy-config-btn"]').exists(),
      ).toBe(true);
    });
  });
});
