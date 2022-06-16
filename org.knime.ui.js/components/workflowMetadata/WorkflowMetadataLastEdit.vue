<script>
import { formatDateString } from '~/webapps-common/util/format';


export default {
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
        lastEdit() {
            return this.workflowData.projectMetadata?.lastEdit;
        }
    },
    methods: {
        formatDateString
    }
};
</script>

<template>
  <div
    v-if="!isComponent"
    class="last-updated"
  >
    <span v-if="lastEdit">Last update: {{ formatDateString(lastEdit) }}</span>
    <span v-else>Last update: no update yet</span>
  </div>
</template>

<style lang="postcss" scoped>
.last-updated {
  color: var(--knime-dove-gray);
  margin-top: 10px;
  margin-bottom: 20px;
  font-style: italic;
}
</style>
