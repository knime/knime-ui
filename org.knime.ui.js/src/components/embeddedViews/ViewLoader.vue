<script lang="ts">
/* eslint-disable valid-jsdoc */
import { defineComponent, type PropType } from 'vue';
import type { KnimeService } from '@knime/ui-extension-service';
import { loadAsyncComponent } from 'webapps-common/ui/util/loadComponentLibrary';

// At the moment this component has to be directly provided because no dynamic counterparts
// that can be loaded exists. Eventually this view will also be loaded dynamically
import FlowVariablePortView from '@/components/output/FlowVariablePortView.vue';
import ImagePortView from '@/components/output/ImagePortView.vue';
import type { ViewConfig, ResourceInfo } from '@/api/gateway-api/custom-types';

export type ViewStateChangeEvent = {
    state: 'loading' | 'ready' | 'error';
    message?: string;
}

type ResourceLocationResolverFn = (params: { resourceInfo: ResourceInfo }) => string;
type InitKnimeServiceFn = (viewConfig: ViewConfig) => KnimeService;
type ViewLoaderConfigFn = () => Promise<ViewConfig>;

/**
 * Dynamically loads and renders a component for a view in the workflow. This could be a port view
 * or a dialog view
 */
export default defineComponent({
    components: {
        FlowVariablePortView,
        ImagePortView
    },

    provide() {
        // "getKnimeService" is required by the loaded view
        return { getKnimeService: () => this.getKnimeService() };
    },

    props: {
        /**
         * A unique key that will be tracked for the loading / re-loading of the view.
         * Everytime it changes the view will reload
         */
        renderKey: {
            type: String,
            required: true
        },
        /**
         * A function to fetch the view's configuration object
         */
        viewConfigLoaderFn: {
            type: Function as PropType<ViewLoaderConfigFn>,
            required: true
        },
        /**
         * A function to initialize the KnimeService. Will return the instance of the
         * KnimeService to inject into the loaded view
         */
        initKnimeService: {
            type: Function as PropType<InitKnimeServiceFn>,
            required: true
        },
        /**
         * A function to resolve the url where to fetch the view from
         */
        resourceLocationResolver: {
            type: Function as PropType<ResourceLocationResolverFn>,
            required: true
        },
        /**
         * Whether the view should be loaded as soon as the component is mounted
         */
        loadOnMount: {
            type: Boolean,
            default: true
        },
        /**
         * Override the component name returned in the view's configuration object and instead
         * use this name to (1) Detect the component after its script is loaded and (2) Register it into the
         * Vue instance under this name
         */
        overrideComponentName: {
            type: [String, null],
            default: null
        }
    },

    emits: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        stateChange: (_payload: ViewStateChangeEvent) => true
    },

    data() {
        return {
            componentName: null,
            initialData: null,
            getKnimeService: null
        };
    },

    watch: {
        componentName(componentName) {
            if (componentName && !this.$options.components[componentName]) {
                throw new Error(`Component ${componentName} hasn't been loaded properly`);
            }
        },
        async renderKey() {
            await this.loadView();
        }
    },

    async mounted() {
        if (this.loadOnMount) {
            await this.loadView();
        }
    },

    methods: {
        async loadView() {
            this.$emit('stateChange', { state: 'loading' });
            this.initialData = null;
            this.componentName = null;

            try {
                const viewConfig = await this.viewConfigLoaderFn();

                await this.renderDynamicViewComponent(viewConfig);
                this.$emit('stateChange', { state: 'ready' });
            } catch (e) {
                this.$emit('stateChange', { state: 'error', message: e });
            }
        },

        /*
         * Renders a view dynamically based on the resource type inside the viewConfig object.
         * Resources can be (for now) either:
         * - Local component references (VUE_COMPONENT_REFERENCE)
         * - Remote component library scripts (VUE_COMPONENT_LIB) fetched over the network
        */
        async renderDynamicViewComponent(viewConfig: ViewConfig) {
            // create knime service and update provide/inject
            const knimeService = this.initKnimeService(viewConfig);
            this.getKnimeService = () => knimeService;

            // set up component, if dynamically loaded
            if (viewConfig.resourceInfo.type === 'VUE_COMPONENT_LIB') {
                await this.setupDynamicComponent(viewConfig);
            }

            // set initial data and component
            this.initialData = JSON.parse(viewConfig.initialData).result;
            this.componentName = this.overrideComponentName || viewConfig.resourceInfo.id;
        },

        /**
         * Fetches and registers a dynamic component that will render a view.
         * It will also initialize the KnimeService that said view requires
         */
        async setupDynamicComponent(viewConfig: ViewConfig) {
            const { resourceInfo } = viewConfig;

            const resourceLocation = this.resourceLocationResolver({ resourceInfo });

            const componentName = this.overrideComponentName || resourceInfo.id;
            // @ts-expect-error
            const component = await loadAsyncComponent({
                resourceLocation,
                componentName
            });
            this.$options.components[componentName] = component;
        }
    }
});
</script>

<template>
  <Component
    :is="componentName"
    v-if="componentName && initialData"
    :initial-data="initialData"
  />
</template>

