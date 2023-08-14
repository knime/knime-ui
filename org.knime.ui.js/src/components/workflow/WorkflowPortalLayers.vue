<!--
  Defines the order of workflow content and portals, this is used to paint stuff ontop of other things
  as svg has no z-index.
-->
<template>
  <!-- Workflow Annotation Layer. Background -->
  <slot name="workflowAnnotation" />

  <!-- Node Selection Plane Layer -->
  <PortalTarget tag="g" name="node-select" />

  <!-- Metanode Port Bars (Inside of Metanodes) -->
  <slot name="metaNodePortBars" />

  <slot name="nodes" />

  <!-- Connectors Layer -->
  <slot name="connector" />

  <!-- Editor Layer; only one editor is open at a time -->
  <PortalTarget tag="g" name="node-text-editor" />

  <!-- Quick Actions Layer: Buttons for Hovered & Selected Nodes and their ids -->
  <PortalTarget tag="g" name="node-actions" />

  <slot name="connectorLabel" />

  <PortalTarget tag="g" name="selected-port" />

  <PortalTarget tag="g" name="editable-annotation" />

  <PortalTarget tag="g" name="annotation-transform" />

  <PortalTarget tag="g" name="drag-connector" />
</template>
