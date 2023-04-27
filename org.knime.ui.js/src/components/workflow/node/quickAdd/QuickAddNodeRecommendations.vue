<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import { mapState } from 'vuex';

import NodeTemplate from '@/components/nodeRepository/NodeTemplate.vue';
import NodeList from '@/components/nodeRepository/NodeList.vue';
import type { ComponentNode, MetaNode, NativeNode } from '@/api/gateway-api/generated-api';

export default defineComponent({
    components: {
        NodeList,
        NodeTemplate
    },
    props: {
        selectedNode: {
            type: [Object, null] as PropType<NativeNode | ComponentNode | MetaNode | null>,
            required: true
        },
        disableRecommendations: {
            type: Boolean,
            default: false
        }
    },
    emits: ['update:selectedNode', 'addNode', 'navReachedTop'],
    expose: ['focusFirst'],
    computed: {
        ...mapState('quickAddNodes', ['recommendedNodes']),

        hasRecommendations() {
            return this.recommendedNodes?.length > 0;
        }
    },
    methods: {
        focusFirst() {
            // @ts-ignore
            return this.$refs.recommendationResults?.focusFirst();
        }
    }
});
</script>

<template>
  <div
    class="recommendations"
  >
    <NodeList
      v-if="hasRecommendations"
      ref="recommendationResults"
      :selected-node="selectedNode"
      :nodes="recommendedNodes"
      :highlight-first="true"
      @nav-reached-top="$emit('navReachedTop')"
      @enter-key="$emit('addNode', $event)"
      @update:selected-node="$emit('update:selectedNode', $event)"
    >
      <template #item="itemProps">
        <NodeTemplate
          v-bind="itemProps"
          @click="$emit('addNode', itemProps.nodeTemplate)"
        />
      </template>
    </NodeList>
    <span
      v-else-if="disableRecommendations"
      class="no-recommendations-message"
    >
      There are no recommendations.<br> Search to add compatible nodes.
    </span>
    <span
      v-else
      class="no-recommendations-message"
    >
      The Workflow Coach cannot recommend any nodes to you yet.
    </span>
  </div>
</template>

<style lang="postcss">
.recommendations {
  overflow-y: auto;
  padding-bottom: 10px;

  & .no-recommendations-message {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-style: italic;
    color: var(--knime-dove-gray);
    flex-direction: column;
    margin-top: 30px;
    margin-bottom: 15px;
  }
}
</style>
