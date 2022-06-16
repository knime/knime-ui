<script>
import { mapPortTypes } from '~/util/portDataMapper';
import MetadataPlaceholder from './MetadataPlaceholder.vue';
import NodePreview from '~/webapps-common/ui/components/node/NodePreview';


export default {
    components: {
        MetadataPlaceholder,
        NodePreview
    },
    props: {
        workflowData: {
            type: Object,
            required: true
        },
        availablePortTypes: {
            type: Object,
            required: true
        }
    },

    computed: {
        containerType() {
            return this.workflowData?.info?.containerType;
        },
        title() {
            const metadataMapper = {
                project: () => this.workflowData.projectMetadata?.title || this.workflowData?.info?.name,
                component: () => {
                    const { componentMetadata: { name } = {} } = this.workflowData;
                    
                    return name;
                }
            };
            const defaultHandler = () => null;

            return (metadataMapper[this.containerType] || defaultHandler)();
        },
        nodePreview() {
            const metadataMapper = {
                project: () => this.workflowData.projectMetadata?.nodePreview,
                component: () => {
                    const { componentMetadata: { inPorts, outPorts, type, icon } = {} } = this.workflowData;
                    
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
            };
            const defaultHandler = () => null;

            return (metadataMapper[this.containerType] || defaultHandler)();
        }
    }
};
</script>

<template>
  <div>
    <h2 :class="['title', { 'with-node-preview': nodePreview }]">
      <div
        v-if="nodePreview"
        class="node-preview"
      >
        <NodePreview v-bind="nodePreview" />
      </div>

      <span v-if="title">{{ title }}</span>
      <MetadataPlaceholder
        v-else
        text="No title has been set yet"
      />
    </h2>
    <hr v-if="!nodePreview">
  </div>
</template>

<style lang="postcss" scoped>
h2 {
  margin: 0;
  font-weight: 400;
  font-size: 18px;
  line-height: 36px;
}

hr {
  border: none;
  border-top: 1px solid var(--knime-silver-sand);
  margin: 0;
}

.title {
  display: flex;
  align-items: center;
  margin-bottom: 5px;

  & .node-preview {
    height: 80px;
    width: 80px;
    margin-right: 9px;
    background-color: white;
    flex-shrink: 0;
  }

  &.with-node-preview {
    margin-bottom: 20px;
  }
}
</style>
