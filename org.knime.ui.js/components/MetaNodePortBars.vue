<script>
import { mapState } from 'vuex';
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
      :y="portBarYPos"
    />
    <MetaNodePortBar
      v-if="hasOutPorts"
      type="out"
      :ports="workflow.metaOutPorts.ports"
      :x="portBarXPos(workflow.metaOutPorts, true)"
      :y="portBarYPos"
    />
  </g>
</template>
