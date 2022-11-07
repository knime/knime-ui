<script>
import { KnimeService } from '@knime/ui-extension-service';

import { getNodeDialog, callNodeDataService } from '@api';
import ViewLoader from './ViewLoader.vue';

/**
 * Dynamically loads a component that will render a Node's configuration dialog
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
        }
    },

    computed: {
        renderKey() {
            if (this.selectedNode?.hasDialog) {
                return [
                    this.projectId,
                    this.workflowId,
                    this.selectedNode.id
                ].join('/');
            }
            return '';
        }
    },

    created() {
        // TODO: NXT-1295 remove hack. Overwrite internally used function by UI Ext's NodeDialog.min.js
        if (!window.closeCEFWindow) {
            window.closeCEFWindow = () => {};
        }
    },

    methods: {
        async viewConfigLoaderFn() {
            try {
                const nodeDialogView = await getNodeDialog({
                    projectId: this.projectId,
                    workflowId: this.workflowId,
                    nodeId: this.selectedNode.id
                });
                
                return nodeDialogView;
            } catch (error) {
                throw error;
            }
        },

        resourceLocationResolver({ resourceInfo }) {
            const { baseUrl, path } = resourceInfo;
            return `${baseUrl}${path}`;
        },

        /* Required by dynamically loaded view components */
        initKnimeService(config) {
            return new KnimeService(
                config,
                
                // Data Service Callback
                async (nodeService, serviceType, request) => {
                    if (nodeService === 'NodeService.callNodeDataService') {
                        await callNodeDataService({
                            projectId: this.projectId,
                            workflowId: this.workflowId,
                            nodeId: this.selectedNode.id,
                            extensionType: 'dialog',
                            serviceType,
                            request
                        });
                    }
                },
                
                // Notification Callback
                (notification) => {
                    // Dispatch a notification to the page builder so that it updates the corresponding view
                    // of the active node, whose settings are controlled by THIS dialog
                    // TODO: NXT-1295 this should be reworked in the pagebuilder somehow, so that the NodeDialog and
                    // the pagebuilder are not coupled to each other like this
                    this.$store.dispatch('pagebuilder/service/pushNotification', notification);
                }
            );
        }
    }
};
</script>

<template>
  <ViewLoader
    :render-key="renderKey"
    :init-knime-service="initKnimeService"
    :view-config-loader-fn="viewConfigLoaderFn"
    :resource-location-resolver="resourceLocationResolver"
    override-component-name="DefaultNodeDialog"
    v-bind="$attrs"
  />
</template>

