// I would say here could be ALL the decorators, included streaming.
// We are testing the icon property. Not the execution.

const { state, decorator } = require('../../../plugins/locators');

// streamingExecution could be separated in features. without decorators. That's why it's called execution.

Feature('nodeExecutionInfo').tag('@schemas-@node-@nodeExecutionInfo');

Before(({ I }) => {
    __`Before each:`;
    I.loadWorkflow('test-streamingExecution');
    I.seeElement({ nodeId: 6, state: state.CONFIGURED });
});

Scenario('Streaming decorators', ({ I }) => {
    __`Decorator on component`;
    I.seeElement({ nodeId: 6, decorator: decorator.STREAMABLE });

    __`Global streaming decorator`;
    I.doubleClickNodeWithCtrl({ nodeId: 6 });
    I.seeElement('.type-notification.onlyStreaming');

    __`Decorators on nodes`;
    I.seeElement({ nodeId: '6:0:1', decorator: decorator.STREAMABLE });
    I.seeElement({ nodeId: '6:0:2', decorator: decorator.STREAMABLE });
    I.seeElement({ nodeId: '6:0:3', decorator: decorator.STREAMABLE });
    I.seeElement({ nodeId: '6:0:6', decorator: decorator.STREAMABLE });
    I.seeElement({ nodeId: '6:0:7', decorator: decorator.STREAMABLE });
    I.seeElement({ nodeId: '6:0:8', decorator: decorator.NOT_STREAMABLE });
    I.dontSeeElement({ nodeId: '6:0:8', decorator: decorator.STREAMABLE });
});
