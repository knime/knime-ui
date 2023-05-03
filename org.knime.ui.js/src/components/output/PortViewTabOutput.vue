<script lang="ts">
/* eslint-disable valid-jsdoc */
/* eslint-disable object-curly-newline  */
import { defineComponent, type PropType } from 'vue';

import type {
    AvailablePortTypes,
    KnimeNode
} from '@/api/gateway-api/custom-types';
import { MetaNodePort, Node, NodeState, type MetaNode } from '@/api/gateway-api/generated-api';
import PortViewLoader from '@/components/embeddedViews/PortViewLoader.vue';
import type { ViewStateChangeEvent } from '@/components/embeddedViews/ViewLoader.vue';

import {
    buildMiddleware,
    validateNodeConfigurationState,
    validateNodeExecutionState,
    validateOutputPorts,
    validatePortSelection,
    validatePortSupport,
    type ValidationResult
} from './output-validator';
import { toPortObject } from '@/util/portDataMapper';

import PortViewTabToggles from './PortViewTabToggles.vue';

/**
 * Runs a set of validations that qualify whether a port from a node is able
 * to show its view
 * @returns object containing an `error` property. If not null then it means the port is invalid. Additionally
 * more details about the error can be read from the `error` object
 */
const runPortValidationChecks = (
    {
        selectedNode,
        portTypes,
        selectedPortIndex
    }: {
        /** the node that is currently selected */
        selectedNode: KnimeNode;
        /** dictionary of Port Types. Can be used to get more information on the port based on its typeId property */
        portTypes: AvailablePortTypes;
        /** index of the selected port */
        selectedPortIndex: number;
    }
) => {
    const validationMiddleware = buildMiddleware(
        validateOutputPorts,
        validatePortSelection,
        validatePortSupport,
        validateNodeConfigurationState,
        // TODO fetch view data for spec views
        validateNodeExecutionState
    );

    const result = validationMiddleware({ selectedNode, portTypes, selectedPortIndex })();

    return Object.freeze(result);
};

const isMetaNode = (node: KnimeNode): node is MetaNode => node.kind === Node.KindEnum.Metanode;

interface ComponentData {
    portViewState: ViewStateChangeEvent | null;
    activeView: { index: number; isSpec: boolean } | null;
}

/**
 * Validates and renders the PortViewLoader. It ensures the conditions are right for the PortView to be loaded
 * via several validation constraints. It yields back information about said validations as well as information
 * about the loading state of the PortView
 */
export default defineComponent({
    components: {
        PortViewLoader,
        PortViewTabToggles
    },

    inheritAttrs: false,

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
            type: Object as PropType<KnimeNode>,
            required: true
        },
        selectedPortIndex: {
            type: Number,
            required: true
        },
        availablePortTypes: {
            type: Object as PropType<AvailablePortTypes>,
            required: true
        }
    },

    emits: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        outputStateChange: (_payload: {
            message: string;
            loading?: boolean;
            error?: {
                type: string;
                code: string;
            }
        }) => true
    },

    data(): ComponentData {
        return {
            portViewState: null,
            activeView: null
        };
    },

    computed: {
        uniquePortViewId() {
            return `${this.selectedNode.id}--${this.selectedPortIndex}`;
        },

        portErrors(): ValidationResult['error'] {
            const { error } = runPortValidationChecks({
                selectedNode: this.selectedNode,
                portTypes: this.availablePortTypes,
                selectedPortIndex: this.selectedPortIndex
            });

            return error;
        },

        selectedPort() {
            if (this.portErrors) {
                console.log('this.portErrors', this.portErrors);
                return null;
            }

            return this.selectedNode.outPorts[this.selectedPortIndex];
        },

        portViews() {
            return toPortObject(this.availablePortTypes)(this.selectedPort.typeId).views;
        },

        shouldShowPortViewTabToggles() {
            if (this.portErrors) {
                return false;
            }

            return this.portErrors
                ? this.portErrors.code === 'NODE_UNEXECUTED'
                : true;
        },

        validationErrors(): ValidationResult['error'] | null {
            return this.portErrors || null;
            // return this.nodeErrors || this.portErrors || null;
        },

        currentNodeState(): 'configured' | 'executed' {
            // metanodes have no configured state so they use the state of the selected output port
            if (isMetaNode(this.selectedNode)) {
                const portState = this.selectedNode.outPorts[this.selectedPortIndex].nodeState;

                return portState === MetaNodePort.NodeStateEnum.CONFIGURED
                    ? 'configured'
                    : 'executed';
            }

            return this.selectedNode.state.executionState === NodeState.ExecutionStateEnum.CONFIGURED
                ? 'configured'
                : 'executed';
        }
    },

    watch: {
        validationErrors: {
            immediate: true,
            handler() {
                if (this.validationErrors) {
                    this.$emit('outputStateChange', {
                        loading: this.validationErrors.code === 'NODE_BUSY',
                        message: this.validationErrors.message,
                        error: this.validationErrors
                    });
                } else {
                    this.$emit('outputStateChange', null);
                }
            }
        },

        uniquePortViewId() {
            this.resetActiveView();
        }
    },

    mounted() {
        // console.log('this.selectedPortIndex', this.selectedPortIndex);
    },

    methods: {
        onPortViewLoaderStateChange(newPortViewState: ViewStateChangeEvent | null) {
            this.portViewState = newPortViewState;

            switch (this.portViewState?.state) {
                case 'loading': {
                    this.$emit('outputStateChange', { message: 'Loading data', loading: true });
                    return;
                }
                case 'error': {
                    this.$emit('outputStateChange', { message: this.portViewState.message });
                    return;
                }
                default: {
                    this.$emit('outputStateChange', null);
                }
            }
        },

        resetActiveView() {
            this.activeView = null;
        }

    }
});
</script>

<template>
  <PortViewTabToggles
    v-if="shouldShowPortViewTabToggles"
    v-model="activeView"
    :current-node-state="currentNodeState"
    :view-descriptors="portViews.descriptors"
    :view-descriptor-mapping="portViews.descriptorMapping"
  />

  <PortViewLoader
    v-if="!portErrors && activeView"
    v-bind="$attrs"
    :project-id="projectId"
    :workflow-id="workflowId"
    :selected-node="selectedNode"
    :selected-port-index="selectedPortIndex"
    :selected-view-index="activeView.index"
    @state-change="onPortViewLoaderStateChange"
  />
</template>
