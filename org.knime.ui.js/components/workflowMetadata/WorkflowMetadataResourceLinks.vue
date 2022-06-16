<script>
import ExternalResourcesList from '~/components/common/ExternalResourcesList';


export default {
    components: {
        ExternalResourcesList
    },
    props: {
        workflowData: {
            type: Object,
            required: true
        }
    },
    computed: {
        isComponent() {
            return this.workflowData?.info?.containerType === 'component';
        },
        links() {
            return this.workflowData.projectMetadata?.links;
        }
    }
};
</script>

<template>
  <ExternalResourcesList
    v-if="!isComponent"
    :links="links"
  />
</template>
