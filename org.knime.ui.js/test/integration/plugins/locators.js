module.exports = {
    /**
    * @object Toolbar actions.
    */
    action: {
        /**
        * @property Cancel all nodes executions.
        */
        CANCEL_ALL: {
            label: 'CANCEL_ALL',
            css: '#toolbar button[title^="Cancel workflow execution"] '
        },
        /**
        * @property Execute all nodes in the workflow.
        */
        EXECUTE_ALL: {
            label: 'EXECUTE_ALL',
            css: '#toolbar button[title^="Execute workflow"] '
        },
        /**
        * @property Execute a specific selected node.
        */
        EXECUTE_NODE: {
            label: 'EXECUTE_NODE',
            css: '#toolbar button[title^="Execute selected nodes"] '
        }
    },
    /**
    * @object Node states.
    */
    state: {
        /**
        * @property Node has been configured correctly, and can be executed.
        */
        CONFIGURED: {
            label: 'CONFIGURED',
            css: '.traffic-light-yellow '
        },
        /**
        * @property Node is being executed. Shown as a progress bar.
        */
        EXECUTING: {
            label: 'EXECUTING',
            css: '.progress-bar '
        },
        /**
        * @property Node is being executed. Shown as a moving circle.
        */
        EXECUTING_CIRCLE: {
            label: 'EXECUTING_CIRCLE',
            css: '.progress-circle '
        },
        /**
        * @property Node is waiting for configuration or incoming data.
        */
        IDLE: {
            label: 'IDLE',
            css: '.traffic-light-red '
        },
        /**
        * @property Node has been successfully executed.
        */
        EXECUTED: {
            label: 'EXECUTED',
            css: '.traffic-light-green '
        }
    },
    /**
    * @object Node Decorator.
    */
    decorator: {
        /**
        * @property 'Streamable' Decorator.
        */
        STREAMABLE: {
            label: 'STREAMABLE',
            css: '.streamable '
        },
        /**
        * @property 'Non Streamable' Decorator.
        */
        NOT_STREAMABLE: {
            label: 'NOT_STREAMABLE',
            css: '.not-streamable '
        }
    },
    /**
    * @object Misc locators. Could be added to other categories in the future.
    */
    misc: {
        /**
        * @property Node execution has been cancelled. Warning sign.
        */
        EXECUTION_CANCELLED: {
            label: 'EXECUTION_CANCELLED',
            css: '.warning '
        }
    },
    /**
    * @object Node actions you can do when hovering a node.
    */
    hover: {
        /**
        * @property Execute node.
        */
        EXECUTE: {
            label: 'EXECUTE',
            css: '.action-button.action-execute '
        },
        /**
        * @property Reset node.
        */
        RESET: {
            label: 'RESET',
            css: '.action-button.action-reset '
        },
        /**
        * @property Open window dialog.
        */
        OPEN_DIALOG: {
            label: 'OPEN_DIALOG',
            css: '.action-button.action-openDialog '
        },
        /**
        * @property Cancel node execution.
        */
        CANCEL: {
            label: 'CANCEL',
            css: '.action-button.action-cancel '
        }
    }
};
