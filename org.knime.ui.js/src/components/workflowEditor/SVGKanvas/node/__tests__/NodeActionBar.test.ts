import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { VueWrapper, mount } from "@vue/test-utils";

import { Node } from "@/api/gateway-api/generated-api";
import ActionButton from "@/components/workflowEditor/common/svgActionBar/ActionButton.vue";
import * as $shapes from "@/style/shapes";
import { mockStores } from "@/test/utils/mockStores";
import NodeActionBar from "../NodeActionBar.vue";

const $shortcuts = {
  get: vi.fn(() => ({})),
  dispatch: vi.fn(() => ({})),
};

vi.mock("@/services/shortcuts", () => ({
  useShortcuts: () => $shortcuts,
}));

describe("NodeActionBar", () => {
  type ComponentProps = InstanceType<typeof NodeActionBar>["$props"];

  const doMount = ({ props }: { props?: Partial<ComponentProps> } = {}) => {
    const mockedStores = mockStores();

    const defaultProps: ComponentProps = {
      nodeId: "root:1",
      isNodeSelected: false,
      nodeKind: Node.KindEnum.Node,
    };

    const wrapper = mount(NodeActionBar, {
      props: {
        ...defaultProps,
        ...props,
      },
      global: {
        mocks: { $shapes, $shortcuts },
        plugins: [mockedStores.testingPinia],
      },
    });

    return { wrapper, mockedStores };
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders disabled action buttons without openNodeConfiguration and openView", () => {
    const { wrapper } = doMount();

    const buttons = wrapper.findAllComponents(ActionButton);

    expect(buttons[0].props()).toStrictEqual(
      expect.objectContaining({ x: -25, disabled: true }),
    );
    expect(buttons[1].props()).toStrictEqual(
      expect.objectContaining({ x: 0, disabled: true }),
    );
    expect(buttons[2].props()).toStrictEqual(
      expect.objectContaining({ x: 25, disabled: true }),
    );
  });

  const getActions = (wrapper: VueWrapper<any>) =>
    wrapper.findAllComponents(ActionButton).map((btn) => btn.props());

  it("shows/hides configure option when ui control is set", async () => {
    const { wrapper, mockedStores } = doMount({
      props: { canConfigure: true },
    });

    expect(getActions(wrapper)).toContainEqual(
      expect.objectContaining({ title: "Configure" }),
    );

    mockedStores.uiControlsStore.canConfigureNodes = false;
    await nextTick();

    expect(getActions(wrapper)).not.toContainEqual(
      expect.objectContaining({ title: "Configure" }),
    );
  });

  it("shows/hides openView option when ui control is set", async () => {
    const { wrapper, mockedStores } = doMount({
      props: { canOpenView: true },
    });

    expect(getActions(wrapper)).toContainEqual(
      expect.objectContaining({ title: "Open view" }),
    );

    mockedStores.uiControlsStore.canDetachNodeViews = false;
    await nextTick();

    expect(getActions(wrapper)).not.toContainEqual(
      expect.objectContaining({ title: "Open view" }),
    );
  });

  it("renders disabled action buttons with openNodeConfiguration and openView", () => {
    const { wrapper } = doMount({
      props: { canConfigure: true, canOpenView: false },
    });

    const buttons = wrapper.findAllComponents(ActionButton);

    expect(buttons.at(0)!.props()).toStrictEqual(
      expect.objectContaining({ x: -50, disabled: false }),
    );
    expect(buttons.at(1)!.props()).toStrictEqual(
      expect.objectContaining({ x: -25, disabled: true }),
    );
    expect(buttons.at(2)!.props()).toStrictEqual(
      expect.objectContaining({ x: 0, disabled: true }),
    );
    expect(buttons.at(3)!.props()).toStrictEqual(
      expect.objectContaining({ x: 25, disabled: true }),
    );
    expect(buttons.at(4)!.props()).toStrictEqual(
      expect.objectContaining({ x: 50, disabled: true }),
    );
  });

  it("renders enabled action buttons", () => {
    const { wrapper } = doMount({
      props: {
        canConfigure: true,
        canExecute: true,
        canCancel: true,
        canReset: true,
        canOpenView: true,
      },
    });

    const buttons = wrapper.findAllComponents(ActionButton);

    // fires action event
    buttons.forEach((button) => {
      button.vm.$emit("click");
    });

    expect($shortcuts.dispatch).toHaveBeenNthCalledWith(1, "configureNode", {
      metadata: {
        nodeId: "root:1",
      },
    });
    expect($shortcuts.dispatch).toHaveBeenNthCalledWith(2, "executeSelected", {
      metadata: {
        nodeId: "root:1",
      },
    });
    expect($shortcuts.dispatch).toHaveBeenNthCalledWith(3, "cancelSelected", {
      metadata: {
        nodeId: "root:1",
      },
    });
    expect($shortcuts.dispatch).toHaveBeenNthCalledWith(4, "resetSelected", {
      metadata: {
        nodeId: "root:1",
      },
    });
    expect($shortcuts.dispatch).toHaveBeenNthCalledWith(
      5,
      "executeAndOpenView",
      {
        metadata: {
          nodeId: "root:1",
        },
      },
    );
  });

  describe("loop action buttons", () => {
    it("should step and pause", () => {
      const { wrapper } = doMount({
        props: { canStep: true, canPause: true, canResume: false },
      });

      // fires action event
      const buttons = wrapper.findAllComponents(ActionButton);
      buttons.forEach((button) => {
        button.vm.$emit("click");
      });

      expect($shortcuts.dispatch).toHaveBeenNthCalledWith(
        1,
        "pauseLoopExecution",
        {
          metadata: {
            nodeId: "root:1",
          },
        },
      );
      expect($shortcuts.dispatch).toHaveBeenNthCalledWith(
        2,
        "stepLoopExecution",
        {
          metadata: {
            nodeId: "root:1",
          },
        },
      );
    });

    it("should step and resume", () => {
      const { wrapper } = doMount({
        props: { canStep: true, canPause: false, canResume: true },
      });

      const buttons = wrapper.findAllComponents(ActionButton);
      buttons.forEach((button) => {
        button.vm.$emit("click");
      });

      expect($shortcuts.dispatch).toHaveBeenNthCalledWith(
        1,
        "resumeLoopExecution",
        {
          metadata: {
            nodeId: "root:1",
          },
        },
      );
      expect($shortcuts.dispatch).toHaveBeenNthCalledWith(
        2,
        "stepLoopExecution",
        {
          metadata: {
            nodeId: "root:1",
          },
        },
      );
    });

    it("should step, pause, resume", () => {
      // ensure only two of the three loop options are rendered at a time
      const { wrapper } = doMount({
        props: { canStep: true, canPause: true, canResume: true },
      });

      const buttons = wrapper.findAllComponents(ActionButton);
      buttons.forEach((button) => {
        button.vm.$emit("click");
      });

      expect($shortcuts.dispatch).toHaveBeenNthCalledWith(
        1,
        "pauseLoopExecution",
        {
          metadata: {
            nodeId: "root:1",
          },
        },
      );
      expect($shortcuts.dispatch).toHaveBeenNthCalledWith(
        2,
        "stepLoopExecution",
        {
          metadata: {
            nodeId: "root:1",
          },
        },
      );
      expect($shortcuts.dispatch).not.toHaveBeenCalledWith(
        "resumeLoopExecution",
        {
          metadata: {
            nodeId: "root:1",
          },
        },
      );
    });
  });

  it("renders node Id", () => {
    const { wrapper } = doMount();

    expect(wrapper.find("text").text()).toBe("root:1");
  });

  it("should add the hotkey binding to the action tooltip when node is selected", () => {
    $shortcuts.get = vi.fn(() => ({ hotkeyText: "MOCK HOTKEY TEXT" }));

    const { wrapper } = doMount({
      props: { canReset: true, isNodeSelected: true },
    });

    const buttons = wrapper.findAllComponents(ActionButton);
    const lastButton = buttons.at(buttons.length - 1)!;

    expect(lastButton.props("title")).toMatch("- MOCK HOTKEY TEXT");
  });
});
