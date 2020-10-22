<script>
import { mapState } from 'vuex';
import WorkflowBreadcrumb from '~/components/WorkflowBreadcrumb';
import Kanvas from '~/components/Kanvas';
import LeftCollapsiblePanel from '~/components/LeftCollapsiblePanel';
import WorkflowMetadata from '~/components/WorkflowMetadata';

/**
 * A component that shows the tab contents belonging to one workflow,
 * i.e. toolbar, canvas, etc.
 */
export default {
    components: {
        Kanvas,
        LeftCollapsiblePanel,
        WorkflowMetadata,
        WorkflowBreadcrumb
    },
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow'
        }),
        metadata() {
            switch (this.workflow.info.containerType) {
            case 'project':
                // return this.workflow.projectMetadata || this.mockMetadata; // TODO: use only for reviewing; remove this
                return this.workflow.projectMetadata || { title: this.workflow.info.name };
            case 'component':
                // eslint-disable-next-line no-case-declarations
                const { componentMetadata:
                    { inPorts, outPorts, name, type, icon, description, dialogs, views } } = this.workflow;
                return {
                    title: name,
                    description,
                    nodePreview: {
                        inPorts,
                        outPorts,
                        icon,
                        type,
                        isComponent: true,
                        hasDynPorts: false
                    },
                    nodeFeatures: {
                        inPorts,
                        outPorts,
                        views,
                        dialogs
                    },
                    isComponent: true
                };
            default:
                return null;
            }
        },
        // TODO: only for review, remove this
        mockMetadata() {
            return {
                title: this.workflow.info.name,
                nodePreview: {
                    hasDynPorts: false,
                    isComponent: true,
                    type: 'Sink',
                    inPorts: [
                        {  dataType: 'table', optional: false, name: 'Input data', description: 'Table containing numeric target column to fit the ARIMA model.' }
                    ],
                    outPorts: [
                        {  color: '#1eb9dc', dataType: 'other', optional: false, name: 'ARIMA Model', description: 'ARIMA model' },
                        {  dataType: 'table', optional: false, name: 'ARIMA Model Summary', description: 'Table containing the coefficient statistics and the following evaluation metrics of the ARIMA model:\r\nRMSE\r\nMAE\r\nMAPE\r\nR2\r\nLog Likelihood\r\nAIC\r\nBIC' },
                        {  dataType: 'table', optional: false, name: 'Residuals', description: 'Table containing the residuals' }
                    ],
                    icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAsklEQVR4nGNgoBUwMDBwMDIyakDGIDFiNAqAFJuYmGAoBoonAPEEoBoFilwHNLyeaEMMIEABTUzA2Nh4PooA0Gn12JwN8jc2cZAYWBxoUgBQcwGQnoBiKgEDYGEFF4CGsgIooIgxAKYHOweLTegGE20AkkEGQC+uRzNgApwDDxQiAchFGOpRTMTvGlA0YqqFBmIBIc2wAMelQAFo+n5s6R4kBrKZqFQITR8omYmUMCIaAAD0RELelYkiBgAAAABJRU5ErkJggg=='
                },
                nodeFeatures: {
                    inPorts: [
                        { dataType: 'table', typeName: 'Table', optional: false, name: 'Corpus of Documents', description: 'An input table containing the original corpus with the related document vectors.' },
                        { dataType: 'other', color: '#9b9b9b', typeName: 'DocumentVectorPortObject', optional: false, name: 'Document Vector Model', description: 'A model containing node settings as well as column names of the term feature space.' },
                        { dataType: 'table', typeName: 'Table', optional: false, name: 'Test Document', description: 'An input table containing the new test document. ' }
                    ],
                    dynInPorts: [
                        {
                            groupName: 'Captured workflow inputs',
                            groupDescription: 'The dynamic inputs of the workflow fragment starting with this node.',
                            types: [
                                {  dataType: 'table', typeName: 'Table' },
                                {  dataType: 'flowVariable', typeName: 'Flow Variable' },
                                {  color: '#41be78', dataType: 'other', typeName: 'Image' },
                                {  color: '#9b9b9b', dataType: 'other', typeName: 'Distance Measure' },
                                {  color: '#1469af', dataType: 'other', typeName: 'PMML' },
                                {  color: '#1eb9dc', dataType: 'other', typeName: 'Naive Bayes' },
                                {  color: '#9b9b9b', dataType: 'other', typeName: 'Cluster Tree' },
                                {  color: '#1eb9dc', dataType: 'other', typeName: 'Sota' },
                                {  color: '#9b9b9b', dataType: 'other', typeName: 'Regression Tree' },
                                {  color: '#9b9b9b', dataType: 'other', typeName: 'Regression Tree' },
                                {  color: '#9b9b9b', dataType: 'other', typeName: 'PortObject' },
                                {  color: '#9b9b9b', dataType: 'other', typeName: 'Feature Elimination' },
                                {  color: '#9b9b9b', dataType: 'other', typeName: 'Correlation' },
                                {  color: '#9b9b9b', dataType: 'other', typeName: 'Feature Selection Model' },
                                {  color: '#1eb9dc', dataType: 'other', typeName: 'Transformation' },
                                {  color: '#1eb9dc', dataType: 'other', typeName: 'Radial Basis Function' },
                                {  color: '#1eb9dc', dataType: 'other', typeName: 'PCA' },
                                {  color: '#1eb9dc', dataType: 'other', typeName: 'Fuzzy Basis Function' },
                                {  color: '#9b9b9b', dataType: 'other', typeName: 'Tree Ensembles' },
                                {  color: '#9b9b9b', dataType: 'other', typeName: 'Gradient Boosting Model' },
                                {  color: '#9b9b9b', dataType: 'other', typeName: 'Tree Ensembles' },
                                {  color: '#1eb9dc', dataType: 'other', typeName: 'Outlier' },
                                {  color: '#1eb9dc', dataType: 'other', typeName: 'URI Object' },
                                {  color: '#1eb9dc', dataType: 'other', typeName: 'Remote Connection' },
                                {  color: '#1eb9dc', dataType: 'other', typeName: 'URI Object' },
                                {  color: '#800000', dataType: 'other', typeName: 'Database Query' },
                                {  color: '#ff4b4b', dataType: 'other', typeName: 'Database Connection' },
                                {  color: '#cc005b', dataType: 'other', typeName: 'DB Session' },
                                {  color: '#66002d', dataType: 'other', typeName: 'DB Data' },
                                {  color: '#1eb9dc', dataType: 'other', typeName: 'FilterDefinition' },
                                {  color: '#178ba5', dataType: 'other', typeName: 'File System' },
                                {  color: '#1eb9dc', dataType: 'other', typeName: 'Normalizer' },
                                {  color: '#9b9b9b', dataType: 'other', typeName: 'PMML Preprocessing' },
                                {  color: '#9b9b9b', dataType: 'other', typeName: 'CAIM' },
                                {  color: '#1eb9dc', dataType: 'other', typeName: 'Color' },
                                {  color: '#1eb9dc', dataType: 'other', typeName: 'Shape' },
                                {  color: '#1eb9dc', dataType: 'other', typeName: 'Size' },
                                {  color: '#000000', dataType: 'other', typeName: 'Workflow Port Object' },
                                {  color: '#9b9b9b', dataType: 'other', typeName: 'KnimeConnection' },
                                {  color: '#9b9b9b', dataType: 'other', typeName: 'Inactive branch' },
                                {  color: '#1eb9dc', dataType: 'other', typeName: 'PMML Discretization' }
                            ]
                        }
                    ],
                    outPorts: [
                        { dataType: 'table', typeName: 'Table', optional: false, name: 'Selected Similar Documents', description: 'A table containing the selected similar documents' },
                        { dataType: 'flowVariable', typeName: 'Flow Variable', optional: false, name: 'Count of Most Similar Documents per Input Document', description: 'A single variable set to the count of matching documents per input document' }
                    ],
                    dynOutPorts: [
                        {
                            groupName: 'Captured Workflow',
                            groupDescription: 'The dynamic outputs of the workflow fragment starting with this node.',
                            types: [
                                {  color: '#2e992e', typeName: 'Workflow', dataType: 'other' },
                                {  color: '#9b9b9b', typeName: 'Distance Measure', dataType: 'other' }
                            ]
                        },
                        {
                            groupName: 'Second DynOutPortGroup',
                            groupDescription: 'The dynamic outputs of the workflow fragment starting with this node.',
                            types: [
                                {  color: '#1eb9dc', typeName: 'Sota', dataType: 'other' }
                            ]
                        }
                    ],
                    views: [
                        {
                            name: '3D View',
                            description: 'Select any structure in the table view at the top and see the 3D representation at the bottom. The bottom view may be empty if the structure being selected does not carry 3D coordinate information.',
                            interactive: true
                        },
                        {
                            name: '3D View',
                            description: 'Select any structure in the table view at the top and see the 3D representation at the bottom. The bottom view may be empty if the structure being selected does not carry 3D coordinate information.',
                            interactive: true
                        }
                    ],
                    dialogs: [
                        {
                            fields: [
                                { name: 'Neighbor Count', description: 'Selects the number of similar neighboring documents you would like to output.', optional: false },
                                { name: 'Min Similarity', description: 'Selects the minimum similarity values you would like to output.', optional: false }
                            ]
                        }
                    ]
                }
            };
        },
        hasBreadcrumb() {
            return this.workflow.parents?.length > 0;
        }
    }
};
</script>

<template>
  <main
    v-if="workflow"
  >
    <WorkflowBreadcrumb
      v-if="hasBreadcrumb"
      class="breadcrumb"
    />

    <LeftCollapsiblePanel
      v-if="metadata"
      id="metadata"
      width="360px"
      title="Workflow Metadata"
    >
      <WorkflowMetadata
        v-bind="metadata"
      />
    </LeftCollapsiblePanel>

    <Kanvas id="kanvas" />
  </main>
  <div
    v-else
    class="placeholder"
  >
    <h2>
      No workflow opened
    </h2>
  </div>
</template>

<style lang="postcss" scoped>
main {
  display: grid;
  overflow: auto;
  grid-template-columns: min-content auto;
  grid-template-rows: min-content auto;
  grid-template-areas:
    "toolbar toolbar"
    "metadata kanvas";
}

#toolbar {
  grid-area: toolbar;
  height: 50px;
  background-color: var(--knime-porcelain);
  border-bottom: 1px solid var(--knime-silver-sand);
}

#metadata {
  grid-area: metadata;
  border-right: 1px solid var(--knime-silver-sand);
}

.breadcrumb {
  grid-area: toolbar;
  min-height: 50px;
  border-bottom: 1px solid var(--knime-silver-sand);
}

#kanvas {
  overflow: auto;
  grid-area: kanvas;
}

.placeholder {
  grid-area: kanvas;
  height: 55%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--knime-stone-gray);
}
</style>
