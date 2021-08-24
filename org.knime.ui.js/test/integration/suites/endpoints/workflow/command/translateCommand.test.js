// PUT executeWorkflowCommand( projectId, workflowId, WorkflowCommand.translate)
// POST redoWorkflowCommand(projectId, workflowId)
// POST undoWorkflowCommand(projectId, workflowId)

const { Trigger } = require('../../../../steps/Trigger');

Feature('Translate command').tag('@endpoints-@workflow-@command-@translateCommand');

Before(({ I }) => {
    __`Before each:`;
    I.loadWorkflow('test-translateCommand');

    I.seeElement({ nodeId: 1 });
    I.seeElement({ nodeId: 2 });
    I.seeElement({ nodeId: 3 });
    I.moveNode({ nodeId: 1 }, 5, 5);
    I.moveNode({ nodeId: 2 }, 5, 5);
    I.moveNode({ nodeId: 3 }, 5, 5);
    I.click('#kanvas');
});

Scenario('Move single node', async ({ I }) => {
    __`Move node`;
    const nodePos = await I.grabNodePosition({ nodeId: 1 });
    const movement = { x: 50, y: 50 };
    I.moveNode({ nodeId: 1 }, movement.x, movement.y);
    const nodeFinalPos = await I.grabNodePosition({ nodeId: 1 });
    I.assertDeepStrictEqual(nodePos.x + movement.x, nodeFinalPos.x);
    I.assertDeepStrictEqual(nodePos.y + movement.y, nodeFinalPos.y);

    __`Check there is a connector`;
    I.seeElement({ sourceNode: 1, destNode: 2 });
});

Scenario('Move multiple nodes', async ({ I }) => {
    __`Move nodes`;
    const movement = { x: 10, y: 50 };
    const node1Pos = await I.grabNodePosition({ nodeId: 1 });
    const node2Pos = await I.grabNodePosition({ nodeId: 2 });
    I.moveMultipleNodesWithShift(movement.x, movement.y, { nodeId: 1 }, { nodeId: 2 });

    const node1FinalPos = await I.grabNodePosition({ nodeId: 1 });
    const node2FinalPos = await I.grabNodePosition({ nodeId: 2 });
    I.assertDeepStrictEqual(node1Pos.x + movement.x, node1FinalPos.x);
    I.assertDeepStrictEqual(node1Pos.y + movement.y, node1FinalPos.y);
    I.assertDeepStrictEqual(node2Pos.x + movement.x, node2FinalPos.x);
    I.assertDeepStrictEqual(node2Pos.y + movement.y, node2FinalPos.y);

    __`Check there is a connector`;
    I.seeElement({ sourceNode: 1, destNode: 2 });
    I.seeElement({ sourceNode: 2, destNode: 3 });
});

Scenario('Move single node, undo and redo - Shortcut', async ({ I }) => {
    __`Move node`;
    const nodeFirstPos = await I.grabNodePosition({ nodeId: 1 });
    const movement = { x: 50, y: 50 };
    I.moveNode({ nodeId: 1 }, movement.x, movement.y);
    const nodeNewPos = await I.grabNodePosition({ nodeId: 1 });
    I.assertDeepStrictEqual(nodeFirstPos.x + movement.x, nodeNewPos.x);
    I.assertDeepStrictEqual(nodeFirstPos.y + movement.y, nodeNewPos.y);

    __`Undo node movement`;
    Trigger.shortcut.undo();
    let nodeActualPos = await I.grabNodePosition({ nodeId: 1 });
    I.assertDeepStrictEqual(nodeFirstPos, nodeActualPos);

    __`Redo node movement`;
    Trigger.shortcut.redo();
    nodeActualPos = await I.grabNodePosition({ nodeId: 1 });
    I.assertDeepStrictEqual(nodeFirstPos.x + movement.x, nodeActualPos.x);
    I.assertDeepStrictEqual(nodeFirstPos.y + movement.y, nodeActualPos.y);
});

Scenario('Move single node, undo and redo - Toolbar', async ({ I }) => {
    __`Move node`;
    const nodeFirstPos = await I.grabNodePosition({ nodeId: 1 });
    const movement = { x: 50, y: 50 };
    I.moveNode({ nodeId: 1 }, movement.x, movement.y);
    const nodeNewPos = await I.grabNodePosition({ nodeId: 1 });
    I.assertDeepStrictEqual(nodeFirstPos.x + movement.x, nodeNewPos.x);
    I.assertDeepStrictEqual(nodeFirstPos.y + movement.y, nodeNewPos.y);

    __`Undo node movement`;
    Trigger.toolbar.undo();
    let nodeActualPos = await I.grabNodePosition({ nodeId: 1 });
    I.assertDeepStrictEqual(nodeFirstPos, nodeActualPos);

    __`Redo node movement`;
    Trigger.toolbar.redo();
    nodeActualPos = await I.grabNodePosition({ nodeId: 1 });
    I.assertDeepStrictEqual(nodeFirstPos.x + movement.x, nodeActualPos.x);
    I.assertDeepStrictEqual(nodeFirstPos.y + movement.y, nodeActualPos.y);
});
