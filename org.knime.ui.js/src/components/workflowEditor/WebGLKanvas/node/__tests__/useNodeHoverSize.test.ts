import { describe, expect, it } from "vitest";
import { type Ref, computed, ref } from "vue";

import { Node } from "@/api/gateway-api/generated-api";
import type { PortPositions } from "@/components/workflowEditor/common/usePortPositions";
import { mountComposable } from "@/test/utils/mountComposable";
import { useNodeHoverSize } from "../useNodeHoverSize";

describe("useNodeHoverSize", () => {
  type MountOps = {
    isHovering?: Ref<boolean>;
    allowedActions?: Partial<Node["allowedActions"]>;
    dialogType?: Node.DialogTypeEnum.Web;
    isUsingEmbeddedDialogs?: Ref<boolean>;
    portPositions?: PortPositions;
  };

  const doMount = ({
    isHovering = ref(false),
    allowedActions = { canReset: false, canCancel: false, canExecute: false },
    dialogType = Node.DialogTypeEnum.Web,
    isUsingEmbeddedDialogs = ref(false),
    portPositions = {
      in: [],
      out: [],
    },
  }: MountOps = {}) => {
    const mountResult = mountComposable({
      composable: useNodeHoverSize,
      composableProps: {
        isHovering,
        // @ts-ignore
        allowedActions,
        portPositions: computed(() => portPositions),
        nodeTopOffset: ref(0),
        dialogType,
        isUsingEmbeddedDialogs,
      },
    });

    return mountResult;
  };

  it("returns hover size", () => {
    const { getComposableResult } = doMount();

    expect(getComposableResult().hoverSize.value).toEqual({
      x: -25,
      y: -35,
      width: 82,
      height: 75,
    });
  });

  it("considers the action bar (can open view)", () => {
    const isHovering = ref(true);
    const { getComposableResult } = doMount({
      isHovering,
      allowedActions: { canOpenView: true },
    });

    expect(getComposableResult().hoverSize.value).toEqual({
      height: 75,
      width: 107,
      x: -37.5,
      y: -35,
    });
  });

  it("considers the action bar (embedded dialogs)", () => {
    const isHovering = ref(true);
    const { getComposableResult } = doMount({
      isHovering,
      isUsingEmbeddedDialogs: ref(true),
    });

    expect(getComposableResult().hoverSize.value).toEqual({
      height: 75,
      width: 107,
      x: -37.5,
      y: -35,
    });
  });

  it("considers the action bar", () => {
    const isHovering = ref(true);
    const { getComposableResult } = doMount({
      isHovering,
      isUsingEmbeddedDialogs: ref(true),
      allowedActions: { canOpenView: true },
    });

    expect(getComposableResult().hoverSize.value).toEqual({
      height: 75,
      width: 132,
      x: -50,
      y: -35,
    });
  });

  it("considers the node port positions", () => {
    const portPositions: PortPositions = {
      in: [
        [30, 0],
        [30, 10],
        [30, 60],
      ],
      out: [
        [30, 0],
        [30, 10],
        [30, 60],
      ],
    };

    const isHovering = ref(true);

    const { getComposableResult } = doMount({
      isHovering,
      portPositions,
      isUsingEmbeddedDialogs: ref(true),
      allowedActions: { canOpenView: true },
    });

    expect(getComposableResult().hoverSize.value).toEqual({
      height: 114.5,
      width: 132,
      x: -50,
      y: -35,
    });
  });

  it.todo("considers the node name");
});
