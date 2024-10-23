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

type ChainType = "qa" | "build";

type KaiMode = ChainType | "quick-build";

interface References {
  [refName: string]: string[];
}

export type {
  NodeWithExtensionInfo,
  ExtensionWithNodes,
  ChainType,
  KaiMode,
  References,
};
