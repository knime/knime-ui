import workflowCommands from './workflowCommands';
import canvasCommands from './canvasCommands';
import applicationCommands from './applicationCommands';

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

const sidePanel = {
    toggleSidePanel: {
        hotkey: ['Ctrl', 'P'],
        execute: ({ $store }) => $store.dispatch('panel/toggleExpanded')
    }
};

export default {
    ...applicationCommands,
    ...conditionGroup(
        // Enabled if workflow is present
        ({ $store }) => Boolean($store.state.workflow.activeWorkflow),
        {
            ...workflowCommands,
            ...selectionCommands,
            ...conditionGroup(
                ({ $store }) => Boolean($store.state.canvas.interactionsEnabled),
                canvasCommands
                
            )
        }
    ),
    ...sidePanel
};

