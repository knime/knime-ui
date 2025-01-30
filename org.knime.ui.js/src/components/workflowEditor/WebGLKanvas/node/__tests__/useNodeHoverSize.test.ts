import { describe, expect, it } from "vitest";
import { ref } from "vue";

import { Node } from "@/api/gateway-api/generated-api";
import { mountComposable } from "@/test/utils/mountComposable";
import { useNodeHoverSize } from "../useNodeHoverSize";

describe("useNodeHoverSize", () => {
  const doMount = ({
    isHovering = ref(false),
    allowedActions = {},
    dialogType = Node.DialogTypeEnum.Web,
    isUsingEmbeddedDialogs = ref(false),
  } = {}) => {
    const mountResult = mountComposable({
      composable: useNodeHoverSize,
      composableProps: {
        isHovering,
        allowedActions,
        nodeNameDimensions: ref({ width: 0, height: 0 }),
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

  it.todo("considers the node name");

  it.todo("considers the node port positions");
});
