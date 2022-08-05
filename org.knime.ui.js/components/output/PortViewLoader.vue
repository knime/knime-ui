<script>
import { KnimeService } from '~/knime-ui-extension-service';

import { getPortView, callPortDataService } from '~api';
import FlowVariablePortView from '~/components/output/FlowVariablePortView.vue';

const loadComponentLibrary = async (window, resourceLocation, componentName) => {
    if (window[componentName]) {
        return Promise.resolve();
    }
    
    // Load and mount component library
    await new Promise((resolve, reject) => {
        const script = window.document.createElement('script');
        script.async = true;
        
        script.addEventListener('load', () => {
            resolve(script);
        });
        
        script.addEventListener('error', () => {
            reject(new Error(`Script loading of "${resourceLocation}" failed`));
            window.document.head.removeChild(script);
        });
        
        script.src = resourceLocation;
        window.document.head.appendChild(script);
    });
    // Lib build defines component on `window` using the name defined during build.
    // This name should match the componentId (this.extensionConfig.resourceInfo.id).
    const Component = window[componentName];
    if (!Component) {
        throw new Error(`Component loading failed. Script invalid.`);
    }
    return Promise.resolve();
};

export default {
    components: {
        FlowVariablePortView
    },

    provide() {
        const getKnimeService = () => this.knimeService;
        getKnimeService.bind(this);
        return { getKnimeService };
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
            portViewerState: null,
            componentId: null,
            initialData: null,
            knimeService: null
        };
    },

    computed: {
        selectedPort() {
            return this.selectedNode.outPorts[this.selectedPortIndex];
        },

        portIdentifier() {
            const { id: nodeId } = this.selectedNode;

            // using UNIQUE keys for all possible ports in knime-ui ensures that a new port view instance
            // is created upon switching ports
            // port object version changes whenever a port state has updated.
            // "ABA"-Changes on the port will always trigger a re-render.
            const uniquePortKey = [
                this.projectId,
                this.workflowId,
                nodeId,
                this.selectedPortIndex,
                this.selectedPort.portObjectVersion
            ].join('/');

            return {
                projectId: this.projectId,
                workflowId: this.workflowId,
                nodeId,
                portIndex: Number(this.selectedPortIndex),
                key: uniquePortKey
            };
        }
    },

    mounted() {
        this.loadPortView();
        ['selectedNode', 'selectedPortIndex'].forEach(prop => {
            this.$watch(prop, () => {
                this.loadPortView();
            });
        });
    },

    methods: {
        initKnimeService(config) {
            const notificationCB = () => {
                console.log('TBD');
            };

            const knimeService = new KnimeService(config, this.loadPortData, notificationCB);
            this.knimeService = knimeService;
        },

        async loadPortView() {
            this.setPortViewerState({ state: 'loading' });
            this.initialData = null;
            this.componentId = null;
            
            try {
                const { projectId, workflowId, nodeId, portIndex } = this.portIdentifier;
                const portView = await getPortView(projectId, workflowId, nodeId, portIndex);
                
                await this.renderDynamicPortView(portView);
                this.setPortViewerState({ state: 'ready' });
            } catch (e) {
                this.setPortViewerState({ state: 'error', message: e });
            }
        },

        async loadPortData(_, serviceType, request) {
            const { projectId, workflowId, nodeId, portIndex } = this.portIdentifier;
            
            const response = await callPortDataService({
                projectId,
                workflowId,
                nodeId,
                portIndex,
                serviceType,
                request
            });

            return { result: JSON.parse(response) };
        },
        // Renders a port view dyanmically based on the resource type
        // return by the getPortView API call. Resources can be (for now) either
        // local component references or remote component library scripts fetched
        // over the network
        async renderDynamicPortView(portViewData) {
            const { resourceInfo: { type: resourceType } } = portViewData;
            
            const missingRenderer = () => {
                throw new Error('Unsupported port view type');
            };

            const portViewRendererMapper = {
                VUE_COMPONENT_REFERENCE: this.vueComponentReferenceRenderer,
                VUE_COMPONENT_LIB: this.vueComponentLibRenderer
            };

            const rendererFn = portViewRendererMapper[resourceType] || missingRenderer;
            const { componentId, initialData } = await rendererFn(portViewData);

            this.componentId = componentId;
            this.initialData = initialData;
        },

        setPortViewerState(state) {
            this.portViewerState = state;
            this.$emit('viewer-state', this.portViewerState);
        },

        vueComponentReferenceRenderer(portViewData) {
            const { resourceInfo, initialData } = portViewData;
            const { id } = resourceInfo;
    
            return {
                initialData: JSON.parse(initialData).result,
                componentId: id
            };
        },

        async vueComponentLibRenderer(portViewData) {
            const { resourceInfo, initialData } = portViewData;
            const { id: componentId } = resourceInfo;
            const resourceLocation = `${resourceInfo.baseUrl}${resourceInfo.path}`;
            
            // check if component library needs to be loaded or if it was already loaded before
            if (!window[componentId]) {
                await loadComponentLibrary(window, resourceLocation, componentId);
            
                // register the component locally
                this.$options.components[componentId] = window[componentId];
            }
            
            // create knime service and update provide/inject
            this.initKnimeService(portViewData);

            return { componentId, initialData: JSON.parse(initialData).result };
        }
    }
};
</script>

<template>
  <component
    :is="componentId"
    v-if="componentId && initialData && knimeService"
    v-bind="portIdentifier"
    :initial-data="initialData"
  />
</template>

