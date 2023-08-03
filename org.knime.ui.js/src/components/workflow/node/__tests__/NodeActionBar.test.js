import { expect, describe, afterEach, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

import * as $shapes from "@/style/shapes.mjs";

import ActionButton from "@/components/common/ActionButton.vue";
import NodeActionBar from "../NodeActionBar.vue";

describe("NodeActionBar", () => {
  const $shortcuts = {
    get: vi.fn(() => ({})),
    dispatch: vi.fn(() => ({})),
  };

  const doMount = ({ props } = {}) => {
    const defaultProps = {
      nodeId: "root:1",
      isNodeSelected: false,
    };

    const wrapper = mount(NodeActionBar, {
      props: {
        ...defaultProps,
        ...props,
      },
      global: {
        mocks: { $shapes, $shortcuts },
      },
    });

    return { wrapper };
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders disabled action buttons without openNodeConfiguration and openView", () => {
    const { wrapper } = doMount();

    let buttons = wrapper.findAllComponents(ActionButton);

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

  it("renders disabled action buttons with openNodeConfiguration and without openView", () => {
    const { wrapper } = doMount({ props: { canOpenDialog: false } });

    let buttons = wrapper.findAllComponents(ActionButton);

    expect(buttons.at(0).props()).toStrictEqual(
      expect.objectContaining({ x: -37.5, disabled: true }),
    );
    expect(buttons.at(1).props()).toStrictEqual(
      expect.objectContaining({ x: -12.5, disabled: true }),
    );
    expect(buttons.at(2).props()).toStrictEqual(
      expect.objectContaining({ x: 12.5, disabled: true }),
    );
    expect(buttons.at(3).props()).toStrictEqual(
      expect.objectContaining({ x: 37.5, disabled: true }),
    );
  });

  it("renders disabled action buttons with openNodeConfiguration and openView", () => {
    const { wrapper } = doMount({
      props: { canOpenDialog: false, canOpenView: false },
    });

    let buttons = wrapper.findAllComponents(ActionButton);

    expect(buttons.at(0).props()).toStrictEqual(
      expect.objectContaining({ x: -50, disabled: true }),
    );
    expect(buttons.at(1).props()).toStrictEqual(
      expect.objectContaining({ x: -25, disabled: true }),
    );
    expect(buttons.at(2).props()).toStrictEqual(
      expect.objectContaining({ x: 0, disabled: true }),
    );
    expect(buttons.at(3).props()).toStrictEqual(
      expect.objectContaining({ x: 25, disabled: true }),
    );
    expect(buttons.at(4).props()).toStrictEqual(
      expect.objectContaining({ x: 50, disabled: true }),
    );
  });

  it("renders enabled action buttons", () => {
    const { wrapper } = doMount({
      props: {
        canOpenDialog: true,
        canExecute: true,
        canCancel: true,
        canReset: true,
        canOpenView: true,
      },
    });

    let buttons = wrapper.findAllComponents(ActionButton);

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
      let buttons = wrapper.findAllComponents(ActionButton);
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

      let buttons = wrapper.findAllComponents(ActionButton);
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

      let buttons = wrapper.findAllComponents(ActionButton);
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
    const lastButton = buttons.at(buttons.length - 1);

    expect(lastButton.props("title")).toMatch("- MOCK HOTKEY TEXT");
  });
});
