<script>
import { mapState } from 'vuex';

import ScrollViewContainer from '~/components/noderepo/ScrollViewContainer';

import WorkflowMetadataTitle from './WorkflowMetadataTitle.vue';
import WorkflowMetadataLastEdit from './WorkflowMetadataLastEdit.vue';
import WorkflowMetadataDescription from './WorkflowMetadataDescription.vue';
import WorkflowMetadataNodeFeatures from './WorkflowMetadataNodeFeatures.vue';
import WorkflowMetadataResourceLinks from './WorkflowMetadataResourceLinks.vue';
import WorkflowMetadataTags from './WorkflowMetadataTags.vue';

/** Displays metadata attached to a root-level workflow */
export default {
    components: {
        ScrollViewContainer,
        WorkflowMetadataTitle,
        WorkflowMetadataLastEdit,
        WorkflowMetadataDescription,
        WorkflowMetadataTags,
        WorkflowMetadataNodeFeatures,
        WorkflowMetadataResourceLinks
    },
    computed: {
        ...mapState('workflow', { workflow: 'activeWorkflow' }),
        ...mapState('application', ['availablePortTypes']),
        shouldRenderMetadata() {
            return this.workflow.info.containerType !== 'metanode';
        }
    }
};
</script>

<template>
  <!-- TODO: NXT-844 why use this stateful ScrollViewContainer here? -->
  <ScrollViewContainer
    v-if="workflow && shouldRenderMetadata"
    class="metadata"
  >
    <WorkflowMetadataTitle
      :workflow-data="workflow"
      :available-port-types="availablePortTypes"
    />

    <WorkflowMetadataLastEdit :workflow-data="workflow" />

    <WorkflowMetadataDescription :workflow-data="workflow" />

    <WorkflowMetadataNodeFeatures
      :workflow-data="workflow"
      :available-port-types="availablePortTypes"
    />

    <WorkflowMetadataResourceLinks :workflow-data="workflow" />

    <WorkflowMetadataTags :workflow-data="workflow" />
  </ScrollViewContainer>
</template>

<style lang="postcss" scoped>
.metadata {
  padding: 8px 20px 20px;
  font-family: "Roboto Condensed", sans-serif;
  font-size: 16px;
  color: var(--knime-masala);

  & > *:last-child {
    margin-bottom: 0;
  }
}
</style>
