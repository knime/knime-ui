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
            return Object.keys(this.workflow.nodes).length;
        }
    }
};
</script>

<template>
  <div>
    <h3>{{ `${workflow.name} - ${nrOfNodes} Nodes` }}</h3>

    <!-- TODO: adjust size of Kanvas NXT-243 -->
    <svg
      :width="1300"
      :height="900"
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
