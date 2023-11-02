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

interface UiStrings {
  disclaimer: string;
  welcome_message: Record<ChainType, string>;
}

interface References {
  [refName: string]: string[];
}

export type {
  NodeWithExtensionInfo,
  ExtensionWithNodes,
  ChainType,
  UiStrings,
  References,
};
