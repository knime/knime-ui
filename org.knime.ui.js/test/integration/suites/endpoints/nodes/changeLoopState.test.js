// changeLoopState(projectId, workflowId, nodeIds[], action)

const { state } = require('../../../plugins/locators');
const { Trigger } = require('../../../steps/Trigger');

Feature('Change Loop State').tag('@endpoints-@node-@changeLoopState');

Before(({ I }) => {
    __`Before each:`;
    I.loadWorkflow('test-changeLoopState');

    I.seeElement({ nodeId: 1 });
    I.seeElement({ nodeId: 6 });
    I.seeElement({ nodeId: 7 });
    I.seeElement({ nodeId: 10 });
    I.seeElement({ nodeId: 210 });
    I.seeElement({ nodeId: 211 });
});

// There's no shortcuts for step loop executions.
// There's no ToolbarActions for step loop executions.
// Actually, while you can execute them, that's not a loop specific action, and that's being tested on changeNodeStates.

Scenario('Step / Resume / Pause - actionBar', ({ I }) => {
    __`Step Loop End node`;
    Trigger.actionBar.stepNode('10');
    I.seeElement({ nodeId: 10, state: state.PAUSED });
    I.seeElement({ nodeId: 7, state: state.EXECUTED });

    __`Resume Loop End Node`;
    Trigger.actionBar.resumeNode('10');
    I.seeElement({ nodeId: 10, state: state.RUNNING });

    __`Pause Loop End Node`;
    Trigger.actionBar.pauseNode('10');
    I.seeElement({ nodeId: 10, state: state.PAUSED });
});

Scenario('Step / Resume / Pause - contextMenu', ({ I }) => {
    __`Step Loop End node`;
    Trigger.contextMenu.stepNode('10');
    I.seeElement({ nodeId: 10, state: state.PAUSED });
    I.seeElement({ nodeId: 7, state: state.EXECUTED });

    __`Resume Loop End Node`;
    Trigger.contextMenu.resumeNode('10');
    I.seeElement({ nodeId: 10, state: state.RUNNING });

    __`Pause Loop End Node`;
    Trigger.contextMenu.pauseNode('10');
    I.seeElement({ nodeId: 10, state: state.PAUSED });
});

// Issue here
Scenario('WorkflowId - Step / Resume / Pause - contextMenu', ({ I }) => {
    __`Open component`;
    I.doubleClickNodeWithCtrl({ nodeId: 210 });
    I.seeElement({ nodeId: '210:0:10', state: state.CONFIGURED });

    __`Step Loop End node`;
    Trigger.contextMenu.stepNode('210:0:10');
    I.seeElement({ nodeId: '210:0:10', state: state.PAUSED });
    I.seeElement({ nodeId: '210:0:7', state: state.EXECUTED });

    __`Resume Loop End Node`;
    Trigger.contextMenu.resumeNode('210:0:10');
    I.seeElement({ nodeId: '210:0:10', state: state.RUNNING });

    __`Pause Loop End Node`;
    Trigger.contextMenu.pauseNode('210:0:10');
    I.seeElement({ nodeId: '210:0:10', state: state.PAUSED });
});

// Issue here
Scenario('WorkflowId - Step / Resume / Pause - actionBar', ({ I }) => {
    __`Open component`;
    I.doubleClickNodeWithCtrl({ nodeId: 210 });
    I.seeElement({ nodeId: '210:0:10', state: state.CONFIGURED });

    __`Step Loop End node`;
    Trigger.actionBar.stepNode('210:0:10');
    I.seeElement({ nodeId: '210:0:10', state: state.PAUSED });
    I.seeElement({ nodeId: '210:0:7', state: state.EXECUTED });

    __`Resume Loop End Node`;
    Trigger.actionBar.resumeNode('210:0:10');
    I.seeElement({ nodeId: '210:0:10', state: state.RUNNING });

    __`Pause Loop End Node`;
    Trigger.actionBar.pauseNode('210:0:10');
    I.seeElement({ nodeId: '210:0:10', state: state.PAUSED });
});
