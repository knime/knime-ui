import { type AnnotationShortcuts, annotationShortcuts } from "./annotation";
import {
  componentOrMetanodeShortcuts,
  type ComponentOrMetanodeShortcuts,
} from "./componentOrMetanodes";

import { type ClipboardShortcuts, clipboardShortcuts } from "./clipboard";

import {
  type CommonWorkflowShortcuts,
  commonWorkflowShortcuts,
} from "./common";

export type WorkflowShortcuts = AnnotationShortcuts &
  ComponentOrMetanodeShortcuts &
  ClipboardShortcuts &
  CommonWorkflowShortcuts;

export const workflowShortcuts = {
  ...annotationShortcuts,
  ...clipboardShortcuts,
  ...componentOrMetanodeShortcuts,
  ...commonWorkflowShortcuts,
};
