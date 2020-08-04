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
            const nodes = Object.values(this.workflow.nodes || {});
            return nodes.length;
        }
    }
};
</script>

<template>
  <div>
    <h3 v-if="workflow">{{ `${workflow.name} - ${nrOfNodes} Nodes` }}</h3>
    <h3 v-else>Loading…</h3>

    <!-- TODO: adjust size of Kanvas NXT-243 -->
    <Annotation
      v-for="(annotation, id) of workflow.workflowAnnotations"
      :key="`annotation-${id}`"
      v-bind="annotation"
    />
    <svg
      :width="1000"
      :height="700"
    >
      <Node
        v-for="node in workflow.nodes"
        :key="`node-${workflow.id}-${node.nodeID}`"
        v-bind="node"
      />
      <Connector
        v-for="(connector, id) of workflow.connections"
        :key="`connector-${workflow.id}-${id}`"
        v-bind="connector"
      />
      <portal-target
        multiple
        tag="g"
        name="node-select"
      />
    </svg>
  </div>
</template>
