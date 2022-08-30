<script>
import { KnimeService } from '@/knime-ui-extension-service';

import { getPortView, callPortDataService } from '@api';
import { loadComponentLibrary } from '@/util/loadComponentLibrary';
import FlowVariablePortView from './FlowVariablePortView.vue';

export default {
    components: {
        FlowVariablePortView
    },

    provide() {
        // "getKnimeService" is required by the loaded port view
        return { getKnimeService: () => this.getKnimeService() };
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
            type: Number,
            required: true
        }
    },

    data() {
        return {
            componentName: null,
            initialData: null,
            getKnimeService: null
        };
    },

    computed: {
        uniquePortKey() {
            // using UNIQUE keys for all possible ports in knime-ui ensures that a new port view instance
            // is created upon switching ports
            // port object version changes whenever a port state has updated.
            // "ABA"-Changes on the port will always trigger a re-render.
           
            let selectedPort = this.selectedNode.outPorts[this.selectedPortIndex];
            return [
                this.projectId,
                this.workflowId,
                this.selectedNode.id,
                this.selectedPortIndex,
                selectedPort.portObjectVersion // TODO: is the solution with the port object version still relevant?
            ].join('/');
        },

        portIdentifier() {
            return {
                projectId: this.projectId,
                workflowId: this.workflowId,
                nodeId: this.selectedNode.id,
                portIndex: Number(this.selectedPortIndex)
            };
        }
    },

    watch: {
        selectedNode() {
            this.loadPortView();
        },
        selectedPortIndex() {
            this.loadPortView();
        },
        componentName(componentName) {
            if (componentName && !this.$options.components[componentName]) {
                throw new Error(`Component ${componentName} hasn't been loaded properly`);
            }
        }
    },

    mounted() {
        this.loadPortView();
    },

    methods: {
        async loadPortView() {
            this.$emit('state-change', { state: 'loading' });
            this.initialData = null;
            this.componentName = null;
            
            try {
                const { projectId, workflowId, nodeId, portIndex } = this.portIdentifier;
                const portView = await getPortView({ projectId, workflowId, nodeId, portIndex });
                
                await this.renderDynamicPortView(portView);
                this.$emit('state-change', { state: 'ready' });
            } catch (e) {
                this.$emit('state-change', { state: 'error', message: e });
            }
        },

        /*
         * Renders a port view dynamically based on the resource type returned by the getPortView API call.
         * Resources can be (for now) either
         * local component references or remote component library scripts fetched
         * over the network
        */
        async renderDynamicPortView(portViewData) {
            const { resourceInfo: { type: resourceType } } = portViewData;
            
            const portViewRendererMapper = {
                VUE_COMPONENT_REFERENCE: this.vueComponentReferenceRenderer,
                VUE_COMPONENT_LIB: this.vueComponentLibRenderer
            };

            const missingRenderer = () => {
                throw new Error('Unsupported port view type');
            };

            const rendererFn = portViewRendererMapper[resourceType] || missingRenderer;
            const { componentName, initialData } = await rendererFn(portViewData);

            this.componentName = componentName;
            this.initialData = initialData;
        },

        /*
         * Returns component name and initial data for a local component
         */
        vueComponentReferenceRenderer(portViewData) {
            const { resourceInfo, initialData } = portViewData;
            const { id } = resourceInfo;
            
            return {
                initialData: JSON.parse(initialData).result,
                componentName: id
            };
        },

        /*
         * Fetches and registers a dynamic component and returns its name and initial data
         */
        async vueComponentLibRenderer(portViewData) {
            const { resourceInfo, initialData } = portViewData;
            const { id: componentName } = resourceInfo;
            const resourceLocation = `${resourceInfo.baseUrl}${resourceInfo.path}`;
            
            // check if component library needs to be loaded or if it was already loaded before
            if (!this.$options.components[componentName]) {
                await loadComponentLibrary({ window, resourceLocation, componentName });

                // register the component locally
                this.$options.components[componentName] = window[componentName];
                delete window[componentName];
            }
            
            // create knime service and update provide/inject
            this.initKnimeService(portViewData);

            return { componentName, initialData: JSON.parse(initialData).result };
        },

        /* Required by dynamically loaded view components */
        initKnimeService(config) {
            const knimeService = new KnimeService(
                config,
                
                // Data Service Callback
                async (_, serviceType, request) => {
                    const { projectId, workflowId, nodeId, portIndex } = this.portIdentifier;
            
                    const response = await callPortDataService({
                        projectId, workflowId, nodeId, portIndex, serviceType, request
                    });

                    return { result: JSON.parse(response) };
                },
                
                // Notification Callback
                () => {
                    // TODO: NXT-1211 implement follow-up ticket for selection/hightlighting in the knime-ui-table
                    consola.warn('Notifications not yet implemented');
                }
            );
            this.getKnimeService = () => knimeService;
        }
    }
};
</script>

<template>
  <component
    :is="componentName"
    v-if="componentName && initialData"
    :key="uniquePortKey"
    v-bind="portIdentifier"
    :initial-data="initialData"
  />
</template>

