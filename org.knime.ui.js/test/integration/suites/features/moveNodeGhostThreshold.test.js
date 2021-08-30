const { state } = require('../../plugins/locators');

Feature('Move Node Ghost Threshold').tag('@features-@moveNodeGhostThreshold');

Before(({ I }) => {
    __`Before each:`;
    I.loadWorkflow('test-workflowFeatures');

    I.seeElement({ nodeId: 131 });
    I.seeElement({ nodeId: 132 });
    I.seeElement({ nodeId: 123 });
    I.seeElement({ nodeId: 124 });
    I.seeElement({ nodeId: 128, state: state.CONFIGURED });
    I.seeElement({ nodeId: 130, state: state.CONFIGURED });
    I.seeElement({ nodeId: 113 });
    I.seeElement({ nodeId: 126 });
    I.seeElement({ nodeId: 121 });
    I.seeElement({ nodeId: 122 });
    I.seeElement({ nodeId: 133 });
});

// eslint-disable-next-line max-len
Scenario('move entire workflow without drop should not have direct updating on the nodes - Ghost threshold', async ({ I }) => {
    I.selectZoom('fit');
    const moveX = 50;
    const moveY = 50;

    __`grab entire workflow node position`;
    const nodePos0 = await I.grabNodePosition({ nodeId: 131 });
    const nodePos1 = await I.grabNodePosition({ nodeId: 132 });
    const nodePos2 = await I.grabNodePosition({ nodeId: 123 });
    const nodePos3 = await I.grabNodePosition({ nodeId: 124 });
    const nodePos4 = await I.grabNodePosition({ nodeId: 128 });
    const nodePos5 = await I.grabNodePosition({ nodeId: 130 });
    const nodePos6 = await I.grabNodePosition({ nodeId: 113 });
    const nodePos7 = await I.grabNodePosition({ nodeId: 126 });
    const nodePos8 = await I.grabNodePosition({ nodeId: 121 });
    const nodePos9 = await I.grabNodePosition({ nodeId: 122 });
    const nodePos10 = await I.grabNodePosition({ nodeId: 133 });

    __`drag workflow`;

    I.selectMultipleNodes(
        { nodeId: 132 },
        { nodeId: 128 },
        { nodeId: 130 },
        { nodeId: 113 },
        { nodeId: 131 },
        { nodeId: 126 },
        { nodeId: 121 },
        { nodeId: 122 },
        { nodeId: 123 },
        { nodeId: 124 },
        { nodeId: 133 }
    );

    I.draggingNode({ nodeId: 132 }, moveX, moveY);

    __`grab entire workflow node position before drop mouse click`;
    const finalNodePos0 = await I.grabNodePosition({ nodeId: 131 });
    const finalNodePos1 = await I.grabNodePosition({ nodeId: 132 });
    const finalNodePos2 = await I.grabNodePosition({ nodeId: 123 });
    const finalNodePos3 = await I.grabNodePosition({ nodeId: 124 });
    const finalNodePos4 = await I.grabNodePosition({ nodeId: 128 });
    const finalNodePos5 = await I.grabNodePosition({ nodeId: 130 });
    const finalNodePos6 = await I.grabNodePosition({ nodeId: 113 });
    const finalNodePos7 = await I.grabNodePosition({ nodeId: 126 });
    const finalNodePos8 = await I.grabNodePosition({ nodeId: 121 });
    const finalNodePos9 = await I.grabNodePosition({ nodeId: 122 });
    const finalNodePos10 = await I.grabNodePosition({ nodeId: 133 });

    __`assert entire workflow position before drop mouse click`;
    I.assertDeepStrictEqual(nodePos0.x, finalNodePos0.x);
    I.assertDeepStrictEqual(nodePos0.y, finalNodePos0.y);
    I.assertDeepStrictEqual(nodePos1.x, finalNodePos1.x);
    I.assertDeepStrictEqual(nodePos1.y, finalNodePos1.y);
    I.assertDeepStrictEqual(nodePos2.x, finalNodePos2.x);
    I.assertDeepStrictEqual(nodePos2.y, finalNodePos2.y);
    I.assertDeepStrictEqual(nodePos3.x, finalNodePos3.x);
    I.assertDeepStrictEqual(nodePos3.y, finalNodePos3.y);
    I.assertDeepStrictEqual(nodePos4.x, finalNodePos4.x);
    I.assertDeepStrictEqual(nodePos4.y, finalNodePos4.y);
    I.assertDeepStrictEqual(nodePos5.x, finalNodePos5.x);
    I.assertDeepStrictEqual(nodePos5.y, finalNodePos5.y);
    I.assertDeepStrictEqual(nodePos6.x, finalNodePos6.x);
    I.assertDeepStrictEqual(nodePos6.y, finalNodePos6.y);
    I.assertDeepStrictEqual(nodePos7.x, finalNodePos7.x);
    I.assertDeepStrictEqual(nodePos7.y, finalNodePos7.y);
    I.assertDeepStrictEqual(nodePos8.x, finalNodePos8.x);
    I.assertDeepStrictEqual(nodePos8.y, finalNodePos8.y);
    I.assertDeepStrictEqual(nodePos9.x, finalNodePos9.x);
    I.assertDeepStrictEqual(nodePos9.y, finalNodePos9.y);
    I.assertDeepStrictEqual(nodePos10.x, finalNodePos10.x);
    I.assertDeepStrictEqual(nodePos10.y, finalNodePos10.y);

    I.dropMouse();
});
