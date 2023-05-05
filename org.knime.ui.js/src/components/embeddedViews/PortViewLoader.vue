<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import { KnimeService } from '@knime/ui-extension-service';

import { API } from '@api';
import type { KnimeNode, ViewConfig } from '@/api/gateway-api/custom-types';
import ViewLoader from '@/components/embeddedViews/ViewLoader.vue';

/**
 * Dynamically loads a component that will render a Port's output view
 */
export default defineComponent({
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
            type: Object as PropType<KnimeNode>,
            required: true
        },
        selectedPortIndex: {
            type: Number,
            required: true
        },
        selectedViewIndex: {
            type: Number,
            required: true
        },
        uniquePortKey: {
            type: String,
            required: true
        }
    },

    emits: ['stateChange'],

    methods: {
        async viewConfigLoaderFn() {
            const portView = await API.port.getPortView({
                projectId: this.projectId,
                workflowId: this.workflowId,
                nodeId: this.selectedNode.id,
                portIdx: this.selectedPortIndex,
                viewIdx: this.selectedViewIndex
            });

            return portView;
        },

        resourceLocationResolver({ resourceInfo }) {
            // TODO: NXT-1295. Originally caused NXT-1217
            // Remove this unnecessary store getter once the issue in the ticket
            // can be solved in a better way. It is necessary at the moment because the TableView is accessing
            // this store module internally, so if not provided then it would error out in the application
            return this.$store.getters['api/uiExtResourceLocation']({ resourceInfo });
        },

        /* Required by dynamically loaded view components */
        initKnimeService(config: ViewConfig) {
            return new KnimeService(
                // @ts-expect-error
                config,

                // Data Service Callback
                async (_, serviceType, dataServiceRequest) => {
                    const response = await API.port.callPortDataService({
                        projectId: this.projectId,
                        workflowId: this.workflowId,
                        nodeId: this.selectedNode.id,
                        portIdx: this.selectedPortIndex,
                        viewIdx: this.selectedViewIndex,
                        serviceType,
                        dataServiceRequest
                    });

                    return { result: JSON.parse(response) };
                },

                // Notification Callback
                () => {
                    // TODO: NXT-1211 implement follow-up ticket for selection/hightlighting in the knime-ui-table
                    consola.warn('Notifications not yet implemented');
                    return Promise.resolve('');
                }
            );
        }
    }
});
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

