import workflowCommands from './workflowCommands';
import canvasCommands from './canvasCommands';
import applicationCommands from './applicationCommands';
import { selectionCommands, sidePanelCommands } from './variousCommands';

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
    ...sidePanelCommands
};

