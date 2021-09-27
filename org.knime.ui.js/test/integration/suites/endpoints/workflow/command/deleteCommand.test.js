// DeleteCommand: nodeIds, connectionIds

const { state } = require('../../../../plugins/locators');
const { Trigger } = require('../../../../steps/Trigger');

Feature('Delete command').tag('@endpoints-@workflow-@command-@deleteCommand');

Before(({ I }) => {
    __`Before each:`;
    I.loadWorkflow('test-deleteCommand');

    I.seeElement({ nodeId: 3 });
    I.seeElement({ nodeId: 208 });
    I.seeElement({ nodeId: 209, state: state.CONFIGURED });
    I.seeElement({ nodeId: 210, state: state.IDLE });
});

Scenario('Single node - Shortcut', ({ I }) => {
    __`Delete node`;
    I.click({ nodeId: 209 });
    Trigger.shortcut.delete();
    I.dontSeeElement({ nodeId: 209 });
    
    __`Undo node`;
    Trigger.shortcut.undo();
    I.seeElement({ nodeId: 209 });

    __`Redo node`;
    Trigger.shortcut.redo();
    I.dontSeeElement({ nodeId: 209 });
});

Scenario('Single connector - Shortcut', ({ I }) => {
    __`Delete connector`;
    I.click({ sourceNode: 208, destNode: 3 });
    Trigger.shortcut.delete();
    I.dontSeeElement({ sourceNode: 208, destNode: 3 });

    __`Undo connector`;
    Trigger.shortcut.undo();
    I.seeElement({ sourceNode: 208, destNode: 3 });

    __`Redo connector`;
    Trigger.shortcut.redo();
    I.dontSeeElement({ sourceNode: 208, destNode: 3 });
});

// FIXME NXT-710
Scenario.skip('Multiple nodes - Shortcut', ({ I }) => {
    __`Delete nodes`;
    I.selectMultipleNodes({ nodeId: 208 }, { nodeId: 209 }, { nodeId: 210 });
    Trigger.shortcut.delete();
    I.dontSeeElement({ nodeId: 208 });
    I.dontSeeElement({ nodeId: 209 });
    I.dontSeeElement({ nodeId: 210 });
    
    __`Undo nodes`;
    Trigger.shortcut.undo();
    I.seeElement({ nodeId: 209 });
    I.seeElement({ nodeId: 209 });
    I.seeElement({ nodeId: 210 });

    __`Redo node`;
    Trigger.shortcut.redo();
    I.dontSeeElement({ nodeId: 208 });
    I.dontSeeElement({ nodeId: 209 });
    I.dontSeeElement({ nodeId: 210 });
});

Scenario('Multiple selectors - Shortcut', ({ I }) => {
    __`Delete nodes`;
    I.selectMultipleConnectors({ sourceNode: 209, destNode: 208 }, { sourceNode: 208, destNode: 3 });
    Trigger.shortcut.delete();
    I.dontSeeElement({ sourceNode: 209, destNode: 208 });
    I.dontSeeElement({ sourceNode: 208, destNode: 3 });
    
    __`Undo nodes`;
    Trigger.shortcut.undo();
    I.seeElement({ sourceNode: 209, destNode: 208 });
    I.seeElement({ sourceNode: 208, destNode: 3 });

    __`Redo node`;
    Trigger.shortcut.redo();
    I.dontSeeElement({ sourceNode: 209, destNode: 208 });
    I.dontSeeElement({ sourceNode: 208, destNode: 3 });
});

// FIXME NXT-710
Scenario.skip('Single node - Toolbar', ({ I }) => {
    __`Delete node`;
    I.click({ nodeId: 209 });
    Trigger.toolbar.delete();
    I.dontSeeElement({ nodeId: 209 });
    
    __`Undo node`;
    Trigger.toolbar.undo();
    I.seeElement({ nodeId: 209 });

    __`Redo node`;
    Trigger.toolbar.redo();
    I.dontSeeElement({ nodeId: 209 });
});

Scenario('Single connector - Toolbar', ({ I }) => {
    __`Delete connector`;
    I.click({ sourceNode: 208, destNode: 3 });
    Trigger.toolbar.delete();
    I.dontSeeElement({ sourceNode: 208, destNode: 3 });

    __`Undo connector`;
    Trigger.toolbar.undo();
    I.seeElement({ sourceNode: 208, destNode: 3 });

    __`Redo connector`;
    Trigger.toolbar.redo();
    I.dontSeeElement({ sourceNode: 208, destNode: 3 });
});

// FIXME NXT-710
Scenario.skip('Multiple nodes - Toolbar', ({ I }) => {
    __`Delete nodes`;
    I.selectMultipleNodes({ nodeId: 208 }, { nodeId: 209 }, { nodeId: 210 });
    Trigger.toolbar.delete();
    I.dontSeeElement({ nodeId: 208 });
    I.dontSeeElement({ nodeId: 209 });
    I.dontSeeElement({ nodeId: 210 });
    
    __`Undo nodes`;
    Trigger.toolbar.undo();
    I.seeElement({ nodeId: 209 });
    I.seeElement({ nodeId: 209 });
    I.seeElement({ nodeId: 210 });

    __`Redo node`;
    Trigger.toolbar.redo();
    I.dontSeeElement({ nodeId: 208 });
    I.dontSeeElement({ nodeId: 209 });
    I.dontSeeElement({ nodeId: 210 });
});

// FIXME NXT-710
Scenario.skip('Multiple selectors - Toolbar', ({ I }) => {
    __`Delete nodes`;
    I.selectMultipleConnectors({ sourceNode: 209, destNode: 208 }, { sourceNode: 208, destNode: 3 });
    Trigger.toolbar.delete();
    I.dontSeeElement({ sourceNode: 209, destNode: 208 });
    I.dontSeeElement({ sourceNode: 208, destNode: 3 });
    
    __`Undo nodes`;
    Trigger.toolbar.undo();
    I.seeElement({ sourceNode: 209, destNode: 208 });
    I.seeElement({ sourceNode: 208, destNode: 3 });

    __`Redo node`;
    Trigger.toolbar.redo();
    I.dontSeeElement({ sourceNode: 209, destNode: 208 });
    I.dontSeeElement({ sourceNode: 208, destNode: 3 });
});

Scenario('Single node - Context Menu', ({ I }) => {
    __`Delete node`;
    Trigger.contextMenu.deleteNode('209');
    I.dontSeeElement({ nodeId: 209 });
});

// FIXME NXT-710
Scenario.skip('Multiple nodes - Context Menu', ({ I }) => {
    __`Delete nodes`;
    I.selectMultipleNodes({ nodeId: 208 }, { nodeId: 209 }, { nodeId: 210 });
    Trigger.contextMenu.deleteNode('208');
    I.dontSeeElement({ nodeId: 208 });
    I.dontSeeElement({ nodeId: 209 });
    I.dontSeeElement({ nodeId: 210 });
});

// FIXME NXT-710
Scenario.skip('WorkflowId - Shortcut', ({ I }) => {
    __`Open Component`;
    I.doubleClickNodeWithCtrl({ nodeId: 210 });
    __`Delete node`;
    I.click({ nodeId: '210:0:208' });
    Trigger.shortcut.delete();
    I.dontSeeElement({ nodeId: '210:0:208' });

    __`Open Metanode`;
    I.doubleClickNode({ nodeId: '210:0:6' });
    I.click({ nodeId: '210:0:6:2' });
    Trigger.shortcut.delete();
    I.dontSeeElement({ nodeId: '210:0:206:2' });
});

// FIXME NXT-710
Scenario.skip('WorkflowId - Toolbar', ({ I }) => {
    __`Open Component`;
    I.doubleClickNodeWithCtrl({ nodeId: 210 });
    __`Delete node`;
    I.click({ nodeId: '210:0:208' });
    Trigger.toolbar.delete();
    I.dontSeeElement({ nodeId: '210:0:208' });

    __`Open Metanode`;
    I.doubleClickNode({ nodeId: '210:0:6' });
    I.click({ nodeId: '210:0:6:2' });
    Trigger.toolbar.delete();
    I.dontSeeElement({ nodeId: '210:0:206:2' });
});

