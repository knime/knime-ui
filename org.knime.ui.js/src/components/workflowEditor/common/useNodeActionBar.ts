import { type FunctionalComponent, type Ref, computed } from "vue";
import type { GraphicsContext } from "pixi.js";

import type { Node } from "@/api/gateway-api/generated-api";
import type { ActionButtonConfig } from "@/components/workflowEditor/types";
import { useShortcuts } from "@/plugins/shortcuts";
import type { ShortcutName } from "@/shortcuts/types";
import { useUIControlsStore } from "@/store/uiControls/uiControls";

export type IconKeys =
  | "CancelIcon"
  | "OpenDialogIcon"
  | "ExecuteIcon"
  | "OpenViewIcon"
  | "PauseIcon"
  | "ResetIcon"
  | "ResumeIcon"
  | "StepIcon";

type UseNodeActionBarOptions = {
  nodeId: string;
  nodeKind: Node.KindEnum;
  isNodeSelected: Ref<boolean>;
  canExecute: Ref<boolean>;
  canCancel: Ref<boolean>;
  canReset: Ref<boolean>;
  canConfigure: Ref<boolean>;
  canStep: Ref<boolean | null>;
  canPause: Ref<boolean | null>;
  canResume: Ref<boolean | null>;
  canOpenView: Ref<boolean | null>;
  icons: Record<IconKeys, GraphicsContext | FunctionalComponent<any>>;
};
export const useNodeActionBar = (options: UseNodeActionBarOptions) => {
  const $shortcuts = useShortcuts();

  /*
   * If this node is selected, hoverTitle appends the hotkey to the title
   * otherwise the title is returned
   */
  const hoverTitle = (title: string, hotkeyText?: string) => {
    return options.isNodeSelected && hotkeyText
      ? `${title} - ${hotkeyText}`
      : title;
  };

  const dispatchShortcut = (
    shortcut: ShortcutName,
    additionalMetadata = {},
  ) => {
    $shortcuts.dispatch(shortcut, {
      metadata: { nodeId: options.nodeId, ...additionalMetadata },
    });
  };

  // all possible actions
  const actions = computed<Record<string, Omit<ActionButtonConfig, "testId">>>(
    () => {
      return {
        configureNode: {
          title: () =>
            hoverTitle("Configure", $shortcuts.get("configureNode").hotkeyText),
          disabled: !options.canConfigure.value,
          icon: options.icons.OpenDialogIcon,
          onClick: () => dispatchShortcut("configureNode"),
        },
        pauseLoopExecution: {
          title: () =>
            hoverTitle(
              "Pause",
              $shortcuts.get("pauseLoopExecution").hotkeyText,
            ),
          disabled: false,
          icon: options.icons.PauseIcon,
          onClick: () => dispatchShortcut("pauseLoopExecution"),
        },
        resumeLoopExecution: {
          title: () =>
            hoverTitle(
              "Resume",
              $shortcuts.get("resumeLoopExecution").hotkeyText,
            ),
          disabled: false,
          icon: options.icons.ResumeIcon,
          onClick: () => dispatchShortcut("resumeLoopExecution"),
        },
        execute: {
          title: () =>
            hoverTitle("Execute", $shortcuts.get("executeSelected").hotkeyText),
          disabled: !options.canExecute.value,
          icon: options.icons.ExecuteIcon,
          onClick: () => dispatchShortcut("executeSelected"),
        },
        stepLoopExecution: {
          title: () =>
            hoverTitle("Step", $shortcuts.get("stepLoopExecution").hotkeyText),
          disabled: !options.canStep.value,
          icon: options.icons.StepIcon,
          onClick: () => dispatchShortcut("stepLoopExecution"),
        },
        cancelExecution: {
          title: () =>
            hoverTitle("Cancel", $shortcuts.get("cancelSelected").hotkeyText),
          disabled: !options.canCancel.value,
          icon: options.icons.CancelIcon,
          onClick: () => dispatchShortcut("cancelSelected"),
        },
        reset: {
          title: () =>
            hoverTitle("Reset", $shortcuts.get("resetSelected").hotkeyText),
          disabled: !options.canReset.value,
          icon: options.icons.ResetIcon,
          onClick: () => dispatchShortcut("resetSelected"),
        },
        openView: {
          title: () =>
            hoverTitle(
              options.canExecute.value ? "Execute and open view" : "Open view",
              $shortcuts.get("executeAndOpenView").hotkeyText,
            ),
          disabled: !options.canOpenView.value && !options.canExecute.value,
          icon: options.icons.OpenViewIcon,
          onClick: () => dispatchShortcut("executeAndOpenView"),
        },
      } as const;
    },
  );

  const uiControls = useUIControlsStore();

  type Actions = typeof actions.value;

  const visibleActions = computed<ActionButtonConfig[]>(() => {
    if (!uiControls.canEditWorkflow) {
      return [];
    }

    const conditionMap: Record<keyof Actions, boolean> = {
      configureNode: Boolean(
        options.canConfigure.value && uiControls.canConfigureNodes,
      ),

      // plain execution
      execute: !options.canPause.value && !options.canResume.value,

      // loop execution
      pauseLoopExecution: Boolean(options.canPause.value),
      resumeLoopExecution: Boolean(
        !options.canPause.value && options.canResume.value,
      ),
      stepLoopExecution: options.canStep.value !== null,

      cancelExecution: true,
      reset: true,

      // other
      openView:
        options.canOpenView.value !== null && uiControls.canDetachNodeViews,
    };

    return Object.entries(conditionMap)
      .filter(([_, visible]) => visible)
      .map(([name, _]) => ({ ...actions.value[name], testId: name }));
  });

  return { visibleActions };
};
