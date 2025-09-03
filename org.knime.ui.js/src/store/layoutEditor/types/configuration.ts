export type ConfigurationLayoutEditorColumnContent = {
  type: "configuration";
  nodeID: string;
};

export type ConfigurationLayoutEditorColumn = {
  content: Array<ConfigurationLayoutEditorColumnContent>;
};

export type ConfigurationLayoutEditorRow = {
  type: "row";
  columns: ConfigurationLayoutEditorColumn[];
};

export type ConfigurationLayout = {
  rows: ConfigurationLayoutEditorRow[];
};

type ConfigurationLayoutEditorItem = {
  type: "configuration";
  nodeID: string;
};

export type ConfigurationLayoutEditorNode = {
  type: "configuration";
  templateId: string;
  name: string;
  icon: string;
  layout: ConfigurationLayoutEditorItem;
  nodeID: string;
  availableInView?: boolean;
  availableInDialog?: boolean;
};
