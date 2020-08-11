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
          returns the upper-left bound [x1, y1],
          the lower-right bound [x2, y2],
          height and width of the workflow
        */
        canvasBounds() {
            const { nodes = {}, workflowAnnotations = {} } = this.workflow;
            const { nodeSize } = this.$shapes;

            let x1 = Infinity; let y1 = Infinity;
            let x2 = -Infinity; let y2 = -Infinity;

            Object.values(nodes).forEach(({ position: { x, y } }) => {
                if (x < x1) { x1 = x; }
                if (y < y1) { y1 = y; }

                if (x + nodeSize > x2) { x2 = x + nodeSize; }
                if (y + nodeSize > y2) { y2 = y + nodeSize; }
            });
            Object.values(workflowAnnotations).forEach(({ bounds: { x, y, height, width } }) => {
                if (x < x1) { x1 = x; }
                if (y < y1) { y1 = y; }

                if (x + width > x2) { x2 = x + width; }
                if (y + height > y2) { y2 = y + height; }
            });

            // there are neither nodes nor workflows annotations
            if (x1 === Infinity) {
                x1 = 0; y1 = 0;
                x2 = 0; y2 = 0;
            }
            
            return {
                x1,
                y1,
                x2,
                y2,
                width: x2 - x1,
                height: y2 - y1
            };
        },
        paddedBounds() {
            const { canvasPadding } = this.$shapes;
            return {
                x: this.canvasBounds.x1 - canvasPadding,
                y: this.canvasBounds.y1 - canvasPadding,
                width: this.canvasBounds.width + 2 * canvasPadding,
                height: this.canvasBounds.height + 2 * canvasPadding
            };
        }
    }
};
</script>

<template>
  <div>
    <h3>{{ `${workflow.name} - ${nrOfNodes} Nodes` }}</h3>

    <svg
      :width="paddedBounds.width"
      :height="paddedBounds.height"
      :viewBox="`${paddedBounds.x} ${paddedBounds.y} ${paddedBounds.width} ${paddedBounds.height}`"
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
