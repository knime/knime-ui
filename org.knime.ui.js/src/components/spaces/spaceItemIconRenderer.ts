import FileTextIcon from "@knime/styles/img/icons/file-text.svg";
import FolderIcon from "@knime/styles/img/icons/folder.svg";
import NodeWorkflowIcon from "@knime/styles/img/icons/node-workflow.svg";
import WorkflowNodeStackIcon from "@knime/styles/img/icons/workflow-node-stack.svg";
import WorkflowIcon from "@knime/styles/img/icons/workflow.svg";

import { SpaceItem } from "@/api/gateway-api/generated-api";

export const spaceItemIconRenderer = (type: SpaceItem.TypeEnum) => {
  const typeIcons = {
    [SpaceItem.TypeEnum.WorkflowGroup]: FolderIcon,
    [SpaceItem.TypeEnum.Workflow]: WorkflowIcon,
    [SpaceItem.TypeEnum.Component]: NodeWorkflowIcon,
    [SpaceItem.TypeEnum.WorkflowTemplate]: WorkflowNodeStackIcon,
    [SpaceItem.TypeEnum.Data]: FileTextIcon,
  };

  return typeIcons[type];
};
