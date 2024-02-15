/* eslint-disable func-style */
import type { ShortcutConditionContext } from "./types";
import type { ShortcutsRegistry } from "./index";

export const conditionGroup = <T extends Partial<ShortcutsRegistry>>(
  groupCondition: (payload: ShortcutConditionContext) => boolean,
  shortcuts: T,
): T => {
  if (groupCondition) {
    Object.values(shortcuts).forEach((shortcut) => {
      const itemCondition = shortcut.condition;
      if (itemCondition) {
        shortcut.condition = (...args) =>
          groupCondition(...args) && itemCondition(...args);
      } else {
        shortcut.condition = groupCondition;
      }
    });
  }

  return shortcuts;
};
