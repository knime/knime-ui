<script>
/* eslint-disable object-curly-newline  */
import {
    buildMiddleware,
    validateNodeConfigurationState,
    validateNodeExecutionState,
    validateOutputPorts,
    validatePortSelection,
    validatePortSupport
} from './output-validator';

import PortViewLoader from './PortViewLoader.vue';

/**
 * Runs a set of validations that qualify whether a node is able
 * to show its port view output
 * @param {Object} payload
 * @param {Object} payload.selectedNode the node that is currently selected
 * @param {Object} payload.portTypes dictionary of Port Types. Can be used to get more information on the port based
 * on its typeId property
 * @returns {Object} object containing an `error` property. If not null then it means the node is invalid. Additionally
 * more details about the error can be read from the `error` object
 */
export const runNodeValidationChecks = ({ selectedNode, portTypes }) => {
    const validationMiddleware = buildMiddleware(
        validateOutputPorts,
        validateNodeConfigurationState
    );

    const result = validationMiddleware({ selectedNode, portTypes })();

    return Object.freeze(result);
};

/**
 * Runs a set of validations that qualify whether a port from a node is able
 * to show its view
 * @param {Object} payload
 * @param {Object} payload.selectedNode the node that is currently selected
 * @param {Object} payload.portTypes dictionary of Port Types. Can be used to get more information on the port based
 * on its typeId property
 * @param {number} payload.selectedPortIndex index of the selected port
 * @returns {Object} object containing an `error` property. If not null then it means the port is invalid. Additionally
 * more details about the error can be read from the `error` object
 */
export const runPortValidationChecks = ({ selectedNode, portTypes, selectedPortIndex }) => {
    const validationMiddleware = buildMiddleware(
        validatePortSelection,
        validatePortSupport,
        validateNodeExecutionState
    );

    const result = validationMiddleware({ selectedNode, portTypes, selectedPortIndex })();

    return Object.freeze(result);
};

/**
 * Validates and renders the PortViewLoader. It ensures the conditions are right for the PortView to be loaded
 * via several validation constraints. It yields back information about said validations as well as information
 * about the loading state of the PortView
 */
export default {
    components: {
        PortViewLoader
    },

    props: {
        projectId: {
            type: String,
            required: true
        },
        workflowId: {
            type: String,
            required: true
        },
        selectedNode: {
            type: Object,
            required: true
        },
        selectedPortIndex: {
            type: [String, null],
            required: true
        },
        availablePortTypes: {
            type: Object,
            required: true
        }
    },

    data() {
        return {
            portViewState: null
        };
    },

    computed: {
        nodeErrors() {
            const { error } = runNodeValidationChecks({
                selectedNode: this.selectedNode,
                portTypes: this.availablePortTypes
            });

            return error;
        },
        
        portErrors() {
            if (this.nodeErrors) {
                return true;
            }

            const { error } = runPortValidationChecks({
                selectedNode: this.selectedNode,
                portTypes: this.availablePortTypes,
                selectedPortIndex: this.selectedPortIndex
            });

            return error;
        },

        selectedPort() {
            if (this.nodeErrors) {
                return null;
            }

            return this.selectedNode.outPorts[this.selectedPortIndex];
        },

        validationErrors() {
            return this.nodeErrors || this.portErrors || null;
        }
    },

    watch: {
        // eslint-disable-next-line valid-jsdoc
        /**
         * Emits null or an object with the following structure:
         *  EventPayload {
         *      message: string;
         *      loading?: string;
         *      error?: {
         *          type: string;
         *          code: string;
         *      }
         *  }
         */
        validationErrors: {
            immediate: true,
            handler() {
                if (this.validationErrors) {
                    this.$emit('output-state-change', {
                        loading: this.validationErrors.code === 'NODE_BUSY',
                        message: this.validationErrors.message,
                        error: this.validationErrors
                    });
                }
            }
        }
    },

    methods: {
        onPortViewLoaderStateChange(newPortViewState) {
            this.portViewState = newPortViewState;

            switch (this.portViewState?.state) {
                case 'loading': {
                    this.$emit('output-state-change', { message: 'Loading data', loading: true });
                    return;
                }
                case 'error': {
                    this.$emit('output-state-change', { message: this.portViewState.message });
                    return;
                }
                default: {
                    this.$emit('output-state-change', null);
                }
            }
        }
    }
};
</script>

<template>
  <PortViewLoader
    v-if="!nodeErrors && !portErrors"
    :project-id="projectId"
    :workflow-id="workflowId"
    :selected-node="selectedNode"
    :selected-port-index="Number(selectedPortIndex)"
    @state-change="onPortViewLoaderStateChange"
  />
</template>
