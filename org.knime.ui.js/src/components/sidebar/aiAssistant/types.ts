interface Node {
  title: string;
  factoryName: string;
}

interface Extension {
  featureSymbolicName: string;
  featureName: string;
  featureVendor: string;
}

interface NodeWithExtensionInfo extends Node, Extension {}

interface ExtensionWithNodes extends Extension {
  nodes: Node[];
}

export type { NodeWithExtensionInfo, ExtensionWithNodes };
