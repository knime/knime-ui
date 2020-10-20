<script>
import LinkList from '~/webapps-common/ui/components/LinkList';
import NodeFeatureList from '~/webapps-common/ui/components/node/NodeFeatureList';
import NodePreview from '~/webapps-common/ui/components/node/NodePreview';
import { formatDateString } from '~/webapps-common/util/format';

/** Displays metadata attached to a root-level workflow */
export default {
    components: {
        LinkList,
        NodeFeatureList,
        NodePreview
    },
    props: {
        /** Single-line description of the workflow */
        title: {
            type: String,
            default: null
        },
        /**  A detailed description of the workflow. */
        description: {
            type: String,
            default: null
        },
        /** The date and time of the last change made to this workflow. Formatted as ISO-String */
        lastEdit: {
            type: String,
            default: null
        },
        /** A list of links external resources (text, url) attached to the workflow */
        links: {
            type: Array,
            default: () => []
        },
        /** A list of tags the user chose to describe the workflow */
        tags: {
            type: Array,
            default: () => [],
            validator: tags => tags.every(tag => typeof tag === 'string')
        }
    },
    // TODO: delete
    data: () => ({
        componentData: {
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
                }
            ],
            dialog: [
                {
                    fields: [
                        { name: 'Neighbor Count', description: 'Selects the number of similar neighboring documents you would like to output.', optional: false },
                        { name: 'Min Similarity', description: 'Selects the minimum similarity values you would like to output.', optional: false }
                    ]
                }
            ]
        },
        nodeIconData: {
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
        }
    }),
    methods: {
        formatDateString
    }
};
</script>

<template>
  <div class="metadata">
    <h2 class="title">
      <div class="node-preview">
        <NodePreview v-bind="nodeIconData" />
      </div>
      <span v-if="title">{{ title }}</span>
      <span
        v-else
        class="placeholder"
      >No title has been set yet</span>
    </h2>

    <div class="last-updated">
      <span v-if="lastEdit">Last Update: {{ formatDateString(lastEdit) }}</span>
      <span
        v-else
        class="placeholder"
      >Last Update: no update yet</span>
    </div>

    <div
      v-if="description"
      class="description"
    >
      {{ description }}
    </div>

    <NodeFeatureList
      v-bind="componentData"
      class="node-feature-list"
    />

    <div class="external-ressources">
      <h2>External Ressources</h2>
      <LinkList
        v-if="links.length"
        :links="links"
      />
      <div
        v-else
        class="placeholder"
      >
        No links have been added yet
      </div>
    </div>

    <div class="tags">
      <h2>Tags</h2>
      <ul v-if="tags.length">
        <li
          v-for="tag of tags"
          :key="tag"
        >
          {{ tag }}
        </li>
      </ul>
      <div
        v-else
        class="placeholder"
      >
        No tags have been set yet
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.metadata {
  box-sizing: border-box;
  padding: 20px 20px;
  font-family: "Roboto Condensed", sans-serif;
  font-size: 18px;
  line-height: 27px;
  color: var(--knime-masala);

  & h2 {
    margin: 0;
    font-weight: normal;
    font-size: 24px;
    line-height: 36px;
  }

  & .placeholder {
    font-style: italic;
  }

  & > *:last-child {
    margin-bottom: 0;
  }
}

.title {
  display: flex;
  align-items: center;

  & .node-preview {
    height: 80px;
    width: 80px;
    margin-right: 9px;
    background-color: white;
    flex-shrink: 0;
  }
}

.last-updated {
  margin: 21px 0;
  font-style: italic;
}

.description {
  margin-bottom: 20px;
}

.node-feature-list {
  margin-bottom: 40px;

  & >>> .shadow-wrapper::after,
  & >>> .shadow-wrapper::before {
    display: none;
  }

  & >>> h6 {
    font-size: 16px;
    margin-bottom: 0;
  }

  & >>> .description {
    font-size: 16px;
  }

  /* Style refinement for Options */
  & >>> .options .panel {
    padding-left: 0;
    margin-left: 52px;
    margin-top: 3px;

    & li > * {
      margin-left: 8px;
    }

    & .option-field-name {
      margin-bottom: 5px;
    }
  }

  /* Style refinement for Views */
  & >>> .views-list {
    & .content {
      margin-top: 5px;
      margin-left: 30px;
    }

    & svg {
      margin-right: 8px;
    }
  }

  /* Style refinement for Ports */
  & >>> .ports-list {
    & .content {
      & ol {
        margin-left: 28px;
        margin-top: 22px;
      }

      & .dyn-ports-description {
        margin-top: 10px;
      }
    }
  }
}

.external-ressources {
  margin-bottom: 38px;

  & ul {
    column-count: 1;
    margin-bottom: -6px;

    & >>> li {
      font-size: 18px;
      line-height: 27px;
    }
  }
}

.tags {
  padding-top: 5px;

  & ul {
    display: flex;
    flex-wrap: wrap;
    list-style: none;
    padding: 0;

    & li {
      border: 1px solid var(--knime-masala);
      padding: 2px 6px;
      font-size: 14px;
      line-height: 21px;
      margin-bottom: 10px;
      margin-right: 5px;
      background-color: var(--knime-white);
    }
  }
}
</style>
