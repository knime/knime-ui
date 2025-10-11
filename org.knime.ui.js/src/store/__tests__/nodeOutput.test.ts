import { describe, expect, it, vi } from "vitest";

import { createNativeNode, createPort, createWorkflow } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";

describe("nodeOutput", () => {
  const eventDigit1 = new KeyboardEvent("keydown", {
    key: "1",
    code: "Digit1",
  });
  const eventDigit2 = new KeyboardEvent("keydown", {
    key: "2",
    code: "Digit2",
  });

  const loadStore = () => {
    const mockedStores = mockStores();

    const node = createNativeNode({
      outPorts: [createPort(), createPort(), createPort(), createPort()],
    });
    const workflow = createWorkflow({ nodes: { [node.id]: node } });
    mockedStores.workflowStore.setActiveWorkflow(workflow);

    vi.mocked(mockedStores.executionStore.openPortView).mockImplementation(() =>
      Promise.resolve(),
    );

    mockedStores.selectionStore.selectNodes([node.id]);
    return { ...mockedStores, workflow, node };
  };

  it("detaches active port tab view", () => {
    const { nodeOutputStore, executionStore, node } = loadStore();

    nodeOutputStore.activePortTab = "view";
    nodeOutputStore.detachActiveTabPortView();
    expect(executionStore.openPortView).toHaveBeenCalledWith({
      node,
      port: "view",
    });
  });

  it("detaches default flow variable view", () => {
    const { nodeOutputStore, executionStore, node } = loadStore();

    nodeOutputStore.detachDefaultFlowVariablePortView();
    expect(executionStore.openPortView).toHaveBeenCalledWith({
      node,
      port: "0",
    });
  });

  it("sets active port view", () => {
    const { nodeOutputStore, executionStore } = loadStore();

    nodeOutputStore.setActivePortTabByKeyboard(eventDigit1);
    expect(executionStore.openPortView).not.toHaveBeenCalled();
    expect(nodeOutputStore.activePortTab).toBe("1");
    nodeOutputStore.setActivePortTabByKeyboard(eventDigit2);
    expect(executionStore.openPortView).not.toHaveBeenCalled();
    expect(nodeOutputStore.activePortTab).toBe("2");
  });

  it("detaches port view by keyboard", () => {
    const { nodeOutputStore, executionStore, node } = loadStore();

    nodeOutputStore.detachPortViewByKeyboard(eventDigit1);
    expect(executionStore.openPortView).toHaveBeenCalledWith({
      node,
      port: "1",
    });
    nodeOutputStore.detachPortViewByKeyboard(eventDigit2);
    expect(executionStore.openPortView).toHaveBeenCalledWith({
      node,
      port: "2",
    });
  });
});
