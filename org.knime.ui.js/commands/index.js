import workflowCommands from './workflowCommands';
import canvasCommands from './canvasCommands';

// chains a group condition before each individual command condition
export const conditionGroup = (groupCondition, commands) => {
    if (groupCondition) {
        Object.values(commands).forEach(command => {
            let itemCondition = command.condition;
            if (itemCondition) {
                command.condition = (...args) => groupCondition(...args) && itemCondition(...args);
            } else {
                command.condition = groupCondition;
            }
        });
    }
    return commands;
};

const selectionCommands = {
    selectAllNodes: {
        hotkey: ['Ctrl', 'A'],
        execute: ({ $store }) => $store.dispatch('selection/selectAllNodes')
    },
    deselectAll: {
        hotkey: ['Ctrl', 'Shift', 'A'],
        execute: ({ $store }) => $store.dispatch('selection/deselectAllObjects')
    }
};

export default {
    ...conditionGroup(
        // Enabled if workflow is present
        ({ $store }) => Boolean($store.state.workflow.activeWorkflow),
        {
            ...workflowCommands,
            ...selectionCommands,
            ...canvasCommands
        }
    )
};

