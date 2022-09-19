import workflowShortcuts from './workflowShortcuts';
import canvasShortcuts from './canvasShortcuts';
import applicationShortcuts from './applicationShortcuts';
import { selectionShortcuts, sidePanelShortcuts } from './miscShortcuts';

// chains a group condition before each individual shortcut condition
export const conditionGroup = (groupCondition, shortcuts) => {
    if (groupCondition) {
        Object.values(shortcuts).forEach(shortcut => {
            let itemCondition = shortcut.condition;
            if (itemCondition) {
                shortcut.condition = (...args) => groupCondition(...args) && itemCondition(...args);
            } else {
                shortcut.condition = groupCondition;
            }
        });
    }
    return shortcuts;
};

export default {
    ...applicationShortcuts,
    ...conditionGroup(
        // Enabled if workflow is present
        ({ $store }) => Boolean($store.state.workflow.activeWorkflow),
        {
            ...workflowShortcuts,
            ...selectionShortcuts,
            ...conditionGroup(
                ({ $store }) => Boolean($store.state.canvas.interactionsEnabled),
                canvasShortcuts
            )
        }
    ),
    ...sidePanelShortcuts
};

