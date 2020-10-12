<script>
import { mapGetters, mapState } from 'vuex';
import MetaNodePortBar from '~/components/MetaNodePortBar';
import { portBar } from '~/mixins';

/**
 * A pair of MetaNodePortBar items. (Or maybe one or none, depending on whether or not the metanode has in/out ports)
 */
export default {
    components: {
        MetaNodePortBar
    },
    mixins: [portBar],
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow'
        }),
        ...mapGetters('workflow', ['workflowBounds', 'svgBounds']),
        hasInPorts() {
            return this.workflow.metaInPorts?.ports?.length;
        },
        hasOutPorts() {
            return this.workflow.metaOutPorts?.ports?.length;
        }
    }
};
</script>

<template>
  <g>
    <MetaNodePortBar
      v-if="hasInPorts"
      type="in"
      :ports="workflow.metaInPorts.ports"
      :x="portBarXPos(workflow.metaInPorts)"
      :y="svgBounds.y"
    />
    <MetaNodePortBar
      v-if="hasOutPorts"
      type="out"
      :ports="workflow.metaOutPorts.ports"
      :x="portBarXPos(workflow.metaOutPorts, true)"
      :y="svgBounds.y"
    />
  </g>
</template>
