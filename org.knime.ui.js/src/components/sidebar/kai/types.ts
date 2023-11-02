interface Node {
  title: string;
  factoryName: string;
}

interface Extension {
  featureSymbolicName: string;
  featureName: string;
  owner: string;
}

interface NodeWithExtensionInfo extends Node, Extension {}

interface ExtensionWithNodes extends Extension {
  nodes: Node[];
}

type ChainType = "qa" | "build";

export type { NodeWithExtensionInfo, ExtensionWithNodes, ChainType };
