<script>
import { mapGetters, mapState } from 'vuex';
import { API } from '@api';
import PageBuilder from 'pagebuilder/src/components/PageBuilder.vue';

import singleViewPage from './singleViewPage.json';

/**
 * Renders a node view via the PageBuilder component
 */
export default {
    components: {
        PageBuilder
    },

    emits: ['stateChange'],

    data() {
        return {
            isReady: false
        };
    },

    computed: {
        ...mapState('application', { projectId: 'activeProjectId' }),
        ...mapState('workflow', { workflowId: state => state.activeWorkflow.info.containerId }),
        ...mapGetters('selection', { selectedNode: 'singleSelectedNode' }),

        hasView() {
            return Boolean(this.selectedNode?.hasView);
        }
    },

    watch: {
        selectedNode: {
            handler(newNode) {
                // if (!this.showDialog && newNode === null && oldNode.hasView) {
                //     // TODO remove selection event listener if
                //     // * node views are shown (instead of dialogs)
                //     // * no other node is selected
                //     // * the previous node had a view
                // }

                if (newNode?.hasView) {
                    this.loadContent(newNode.id);
                }
            }
        }
    },

    async created() {
        try {
            this.$emit('stateChange', { state: 'loading', message: 'Loading view' });

            await this.loadContent();

            this.isReady = true;
            this.$emit('stateChange', { state: 'ready' });
        } catch (error) {
            this.$emit('stateChange', { state: 'error', message: error });
        }
    },

    methods: {
        async loadContent() {
            try {
                if (!this.selectedNode) {
                    return;
                }

                const nodeView = await API.node.getNodeView({
                    projectId: this.projectId,
                    workflowId: this.workflowId,
                    nodeId: this.selectedNode.id
                });

                const page = JSON.parse(JSON.stringify(singleViewPage));
                page.wizardPageContent.nodeViews.ROOT = nodeView;

                // eslint-disable-next-line consistent-return
                return this.$store.dispatch('pagebuilder/setPage', { page });
            } catch (error) {
                consola.log('Error loading view content', error);
                throw error;
            }
        }
    }

};
</script>

<template>
  <PageBuilder
    v-if="isReady"
    class="page-builder"
  />
</template>

<style lang="postcss" scoped>
.page-builder {
  height: 100%;

  & :deep(> div),
  & :deep(.container-fluid),
  & :deep(.row) {
      height: 100%;
  }
}
</style>

