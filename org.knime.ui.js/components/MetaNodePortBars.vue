<script>
import { mapGetters, mapState } from 'vuex';
import MetaNodePortBar from '~/components/MetaNodePortBar';

export default {
    components: {
        MetaNodePortBar
    },
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow'
        }),
        ...mapGetters('workflow', ['svgBounds'])
    }
};
</script>

<template>
  <g>
    <MetaNodePortBar
      type="in"
      :ports="workflow.metaInPorts"
      :x="svgBounds.x"
      :y="svgBounds.y"
      :height="svgBounds.height"
    />
    <MetaNodePortBar
      type="out"
      :ports="workflow.metaOutPorts"
      :x="svgBounds.x + svgBounds.width"
      :y="svgBounds.y"
      :height="svgBounds.height"
    />
  </g>
</template>
