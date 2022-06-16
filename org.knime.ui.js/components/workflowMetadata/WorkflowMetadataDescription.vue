<script>
import Description from '~/webapps-common/ui/components/Description';
import MetadataPlaceholder from './MetadataPlaceholder.vue';

export default {
    components: {
        Description,
        MetadataPlaceholder
    },
    props: {
        workflowData: {
            type: Object,
            required: true
        }
    },
    computed: {
        description() {
            const metadataMapper = {
                project: () => this.workflowData.projectMetadata?.description,
                component: () => {
                    const { componentMetadata: { description } = {} } = this.workflowData;
                    
                    return description;
                }
            };
            const defaultHandler = () => null;

            return (metadataMapper[this.workflowData?.info?.containerType] || defaultHandler)();
        }
    }
};
</script>

<template>
  <div class="description">
    <Description
      v-if="description"
      :text="description"
    />
    <MetadataPlaceholder
      v-else
      padded
      text="No description has been set yet"
    />
  </div>
</template>

<style lang="postcss" scoped>
.description {
  margin-bottom: 20px;
  font-size: 16px;
}
</style>
