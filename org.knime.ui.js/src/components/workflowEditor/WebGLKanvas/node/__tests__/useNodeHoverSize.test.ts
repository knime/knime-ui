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
      x: -19,
      y: -29,
      width: 70,
      height: 69,
    });
  });

  it("considers the action bar (can open view)", () => {
    const isHovering = ref(true);
    const { getComposableResult } = doMount({
      isHovering,
      allowedActions: { canOpenView: true },
    });

    expect(getComposableResult().hoverSize.value).toEqual({
      x: -31.5,
      y: -29,
      width: 95,
      height: 69,
    });
  });

  it("considers the action bar (embedded dialogs)", () => {
    const isHovering = ref(true);
    const { getComposableResult } = doMount({
      isHovering,
      isUsingEmbeddedDialogs: ref(true),
    });

    expect(getComposableResult().hoverSize.value).toEqual({
      x: -31.5,
      y: -29,
      width: 95,
      height: 69,
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
      x: -44,
      y: -29,
      width: 120,
      height: 69,
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
      x: -44,
      y: -29,
      width: 120,
      height: 108.5,
    });
  });

  it.todo("considers the node name");
});
