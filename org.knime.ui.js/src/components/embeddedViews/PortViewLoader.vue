<script>
import { KnimeService } from '@knime/ui-extension-service';

import { getPortView, callPortDataService } from '@api';
import ViewLoader from '@/components/embeddedViews/ViewLoader.vue';

/**
 * Dynamically loads a component that will render a Port's output view
 */
export default {
    components: {
        ViewLoader
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

    emits: ['stateChange'],

    computed: {
        uniquePortKey() {
            // using UNIQUE keys for all possible ports in knime-ui ensures that a new port view instance
            // is created upon switching ports
            // port object version changes whenever a port state has updated.
            // "ABA"-Changes on the port will always trigger a re-render.

            return [
                this.projectId,
                this.workflowId,
                this.selectedNode.id,
                this.selectedPortIndex
            ].join('/');
        }
    },

    methods: {
        async viewConfigLoaderFn() {
            try {
                const portView = await getPortView({
                    projectId: this.projectId,
                    workflowId: this.workflowId,
                    nodeId: this.selectedNode.id,
                    portIdx: this.selectedPortIndex
                });
                return portView;
            } catch (error) {
                throw error;
            }
        },

        resourceLocationResolver({ resourceInfo }) {
            // TODO: NXT-1295. Originally caused NXT-1217
            // Remove this unnecessary store getter once the issue in the ticket
            // can be solved in a better way. It is necessary at the moment because the TableView is accessing
            // this store module internally, so if not provided then it would error out in the application
            return this.$store.getters['api/uiExtResourceLocation']({ resourceInfo });
        },

        /* Required by dynamically loaded view components */
        initKnimeService(config) {
            return new KnimeService(
                config,

                // Data Service Callback
                async (_, serviceType, request) => {
                    const response = await callPortDataService({
                        projectId: this.projectId,
                        workflowId: this.workflowId,
                        nodeId: this.selectedNode.id,
                        portIdx: this.selectedPortIndex,
                        serviceType,
                        request
                    });

                    return { result: JSON.parse(response) };
                },

                // Notification Callback
                () => {
                    // TODO: NXT-1211 implement follow-up ticket for selection/hightlighting in the knime-ui-table
                    consola.warn('Notifications not yet implemented');
                }
            );
        }
    }
};
</script>

<template>
  <ViewLoader
    :render-key="uniquePortKey"
    :init-knime-service="initKnimeService"
    :view-config-loader-fn="viewConfigLoaderFn"
    :resource-location-resolver="resourceLocationResolver"
    @state-change="$emit('stateChange', $event)"
  />
</template>

