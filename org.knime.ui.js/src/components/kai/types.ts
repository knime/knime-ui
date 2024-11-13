interface Node {
  title: string;
  factoryName: string;
  factoryId: string;
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

interface Extensions {
  [key: string]: ExtensionWithNodes;
}

type ChainType = "qa" | "build";

interface References {
  [refName: string]: string[];
}

export type {
  NodeWithExtensionInfo,
  ExtensionWithNodes,
  Extensions,
  ChainType,
  References,
};
