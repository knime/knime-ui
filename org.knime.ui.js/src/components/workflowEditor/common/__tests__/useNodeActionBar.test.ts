import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";

import { createNativeNode, createPort } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import { mountComposable } from "@/test/utils/mountComposable";
import { useNodeActionBar } from "../useNodeActionBar";

vi.mock("@knime/components", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    // @ts-expect-error
    ...actual,
    useToasts: vi.fn(),
  };
});

const routerPush = vi.fn();
vi.mock("vue-router", () => ({
  useRouter: vi.fn(() => ({ push: routerPush })),
  useRoute: vi.fn(() => ({})),
}));

vi.mock("@/router/router", () => ({
  push: vi.fn(),
}));

describe("useNodeActionBar", () => {
  const doMount = ({
    isNodeSelected = true,
    canExecute = true,
    canCancel = true,
    canReset = true,
    canConfigure = true,
    canStep = true,
    canPause = true,
    canResume = true,
    canOpenView = true,
  } = {}) => {
    const node = createNativeNode({
      inPorts: [
        createPort({ typeId: "org.knime.core.node.BufferedDataTable" }),
      ],
      outPorts: [
        createPort({ typeId: "org.knime.core.node.BufferedDataTable" }),
      ],
    });
    const mockedStores = mockStores();

    const result = mountComposable({
      composable: useNodeActionBar,
      composableProps: {
        nodeId: node.id,
        nodeKind: node.kind,
        isNodeSelected: ref(isNodeSelected),
        canExecute: ref(canExecute),
        canCancel: ref(canCancel),
        canReset: ref(canReset),
        canConfigure: ref(canConfigure),
        canStep: ref(canStep),
        canPause: ref(canPause),
        canResume: ref(canResume),
        canOpenView: ref(canOpenView),
        // @ts-expect-error
        icons: {},
      },
      mockedStores,
    });

    return { ...result, mockedStores };
  };

  it("shows all actions", () => {
    const { getComposableResult } = doMount();
    expect(getComposableResult().visibleActions.value.length).toBe(6);
  });

  it("with no rights only the disabled defaults are shown", () => {
    const { getComposableResult } = doMount({
      canExecute: false,
      canCancel: false,
      canReset: false,
      canConfigure: false,
      canStep: false,
      canPause: false,
      canResume: false,
      canOpenView: false,
    });
    expect(
      getComposableResult().visibleActions.value.map((a) => [
        a.name,
        a.disabled,
      ]),
    ).toStrictEqual([
      ["execute", true],
      ["stepLoopExecution", true],
      ["cancelExecution", true],
      ["reset", true],
      ["openView", true],
    ]);
  });

  it("no actions for non editable workflows", () => {
    const { getComposableResult, mockedStores } = doMount();
    mockedStores.uiControlsStore.canEditWorkflow = false;
    expect(getComposableResult().visibleActions.value.length).toBe(0);
  });

  it("hide configure action if its not allowed in general", () => {
    const { getComposableResult, mockedStores } = doMount({
      canConfigure: true,
    });
    mockedStores.uiControlsStore.canConfigureNodes = false;
    expect(
      getComposableResult().visibleActions.value.map((a) => a.name),
    ).not.toContain("configureNode");
  });

  it("hide openView action if canDetachNodeViews is not allowed", () => {
    const { getComposableResult, mockedStores } = doMount({
      canConfigure: true,
    });
    mockedStores.uiControlsStore.canDetachNodeViews = false;
    expect(
      getComposableResult().visibleActions.value.map((a) => a.name),
    ).not.toContain("canOpenView");
  });

  it.each([
    ["configureNode", { canConfigure: true }],
    ["execute", { canPause: false, canResume: false }],
    ["pauseLoopExecution", { canPause: true }],
    ["resumeLoopExecution", { canPause: false, canResume: true }],
    ["openView", { canOpenView: true }],
    ["cancelExecution", {}],
    ["reset", {}],
  ])("shows '%s' action", (actionName, config) => {
    const { getComposableResult } = doMount({
      canExecute: false,
      canCancel: false,
      canReset: false,
      canConfigure: false,
      canStep: false,
      canPause: false,
      canResume: false,
      canOpenView: false,
      ...config,
    });
    expect(
      getComposableResult().visibleActions.value.map((a) => a.name),
    ).toContain(actionName);
  });
});
