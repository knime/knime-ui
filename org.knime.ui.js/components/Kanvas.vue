<script>
import { mapState } from 'vuex';
import Node from '~/components/Node';
import Connector from '~/components/Connector';
import Annotation from '~/components/Annotation';

export default {
    components: {
        Node,
        Connector,
        Annotation
    },
    computed: {
        ...mapState('workflows', ['workflow']),
        nrOfNodes() {
            return Object.keys(this.workflow.nodes || {}).length;
        },

        /*
          returns the upper-left bound [xMin, yMin] and the lower-right bound [xMax, yMax] of the workflow
        */
        workflowBounds() {
            const { nodes = {}, workflowAnnotations = {} } = this.workflow;
            const { nodeSize } = this.$shapes;

            let left = Infinity;
            let top = Infinity;
            let right = -Infinity;
            let bottom = -Infinity;

            Object.values(nodes).forEach(({ position: { x, y } }) => {
                if (x < left) { left = x; }
                if (y < top) { top = y; }

                if (x + nodeSize > right) { right = x + nodeSize; }
                if (y + nodeSize > bottom) { bottom = y + nodeSize; }
            });
            Object.values(workflowAnnotations).forEach(({ bounds: { x, y, height, width } }) => {
                if (x < left) { left = x; }
                if (y < top) { top = y; }

                if (x + width > right) { right = x + width; }
                if (y + height > bottom) { bottom = y + height; }
            });

            // there are neither nodes nor workflows annotations
            if (left === Infinity) {
                left = 0;
                top = 0;
                right = 0;
                bottom = 0;
            }

            return {
                left,
                top,
                right,
                bottom
            };
        },

        svgBounds() {
            const { canvasPadding } = this.$shapes;
            let { left, top, right, bottom } = this.workflowBounds;
            let x = Math.min(0, left);
            let y = Math.min(0, top);
            let width = right - x + canvasPadding;
            let height = bottom - y + canvasPadding;
            return {
                x, y, width, height
            };
        }
    }
};
</script>

<template>
  <div>
    <h3>{{ `${workflow.name} - ${nrOfNodes} Nodes` }}</h3>

    <svg
      :width="svgBounds.width"
      :height="svgBounds.height"
      :viewBox="`${svgBounds.x} ${svgBounds.y} ${svgBounds.width} ${svgBounds.height}`"
    >
      <Annotation
        v-for="(annotation, id) of workflow.workflowAnnotations"
        :key="`annotation-${id}`"
        v-bind="annotation"
      />
      <Connector
        v-for="(connector, id) of workflow.connections"
        :key="`connector-${workflow.id}-${id}`"
        v-bind="connector"
      />
      <Node
        v-for="node in workflow.nodes"
        :key="`node-${workflow.id}-${node.id}`"
        v-bind="node"
      />
      <portal-target
        multiple
        tag="g"
        name="node-select"
      />
    </svg>
  </div>
</template>

<style scoped>
h3 {
  position: fixed;
}
</style>
