<script>
import { mapState } from 'vuex';

import { mapPortTypes } from '~/util/portDataMapper';

import WorkflowMetadataTitle from './WorkflowMetadataTitle.vue';
import WorkflowMetadataLastEdit from './WorkflowMetadataLastEdit.vue';
import WorkflowMetadataDescription from './WorkflowMetadataDescription.vue';
import WorkflowMetadataNodeFeatures from './WorkflowMetadataNodeFeatures.vue';
import WorkflowMetadataTags from './WorkflowMetadataTags.vue';
import ExternalResourcesList from '~/components/common/ExternalResourcesList';

/** Displays metadata attached to a root-level workflow */
export default {
    components: {
        WorkflowMetadataTitle,
        WorkflowMetadataLastEdit,
        WorkflowMetadataDescription,
        WorkflowMetadataTags,

        // TODO: Merge with Node Description Metadata
        WorkflowMetadataNodeFeatures,

        // TODO: Put this into metadata folder
        ExternalResourcesList

        // TODO: styling margin
    },
    computed: {
        ...mapState('workflow', { workflow: 'activeWorkflow' }),
        ...mapState('application', ['availablePortTypes']),
        containerType() {
            return this.workflow.info?.containerType;
        },
        hasMetadata() {
            return this.containerType !== 'metanode';
        },
        isComponent() {
            return this.containerType === 'component';
        },
        title() {
            switch (this.containerType) {
                // if no title has been set yet, display the workflow's name
                case 'project': return this.workflow.projectMetadata?.title || this.workflow.info?.name;
                case 'component': {
                    const { componentMetadata: { name } = {} } = this.workflow;
                    return name;
                }
                default: throw new Error('unknown container type');
            }
        },
        nodePreview() {
            if (this.isComponent) {
                const { componentMetadata: { inPorts, outPorts, type, icon } = {} } = this.workflow;
                const mappedInPorts = mapPortTypes(inPorts, this.availablePortTypes);
                const mappedOutPorts = mapPortTypes(outPorts, this.availablePortTypes);
              
                return {
                    inPorts: mappedInPorts,
                    outPorts: mappedOutPorts,
                    icon,
                    type,
                    isComponent: true,
                    hasDynPorts: false
                };
            }
            return null;
        },
        lastEdit() {
            return this.workflow.projectMetadata?.lastEdit;
        },
        description() {
            switch (this.containerType) {
                case 'project': return this.workflow.projectMetadata?.description;
                case 'component': {
                    const { componentMetadata: { description } = {} } = this.workflow;
                    return description;
                }
                default: throw new Error('unknown container type');
            }
        },
        nodeFeatures() {
            switch (this.containerType) {
                case 'project': return this.workflow.projectMetadata?.nodeFeatures;
                case 'component': {
                    const {
                        componentMetadata: { inPorts, outPorts, options, views } = {}
                    } = this.workflow;
                    
                    const mappedInPorts = mapPortTypes(inPorts, this.availablePortTypes);
                    const mappedOutPorts = mapPortTypes(outPorts, this.availablePortTypes);

                    return { inPorts: mappedInPorts, outPorts: mappedOutPorts, views, options };
                }
                default: throw new Error('unknown container type');
            }
        },
        links() {
            return this.workflow.projectMetadata?.links;
        },
        tags() {
            return this.workflow.projectMetadata?.tags;
        }
    }
};
</script>

<template>
  <div
    v-if="workflow && hasMetadata"
    class="metadata"
  >
    <WorkflowMetadataTitle
      :title="title"
      :node-preview="nodePreview"
    />

    <WorkflowMetadataLastEdit
      v-if="!isComponent"
      :last-edit="lastEdit"
    />

    <WorkflowMetadataDescription :description="description" />

    <WorkflowMetadataNodeFeatures
      v-if="nodeFeatures"
      :node-features="nodeFeatures"
    />

    <ExternalResourcesList
      v-if="!isComponent"
      :links="links"
    />

    <WorkflowMetadataTags
      v-if="!isComponent"
      :tags="tags"
    />
  </div>
</template>

<style lang="postcss" scoped>
.metadata {
  overflow: auto;
  height: 100%;
  padding: 8px 20px 20px;
  font-family: "Roboto Condensed", sans-serif;
  font-size: 16px;
  color: var(--knime-masala);

  & > *:last-child {
    margin-bottom: 0;
  }
}
</style>
