/* eslint-disable no-magic-numbers */
import type { Shortcut } from "./types";

/**
 * This file contains descriptions of hotkeys that are not using the shortcut system and still
 * need to be listed for the user. For example hotkeys in externally
 * loaded ui elements (e.g. the table view) or because the handling
 * requires more code like move of annotations.
 */
const otherHotkeys: Array<Partial<Shortcut>> = [
  /** UI-Extensions Node Output */
  {
    hotkey: ["Ctrl", "C"],
    description: "Copy selected table cells",
    group: "general",
  },
  {
    hotkey: ["Ctrl", "Shift", "C"],
    description: "Copy selected table cells and corresponding header",
    group: "general",
  },
  /** general */
  {
    hotkey: ["Esc"],
    description: "Close any dialog unsaved",
    group: "general",
  },
  /** Workflow editor modes */
  {
    hotkey: ["Esc"],
    description: "Leave Pan or Annotation mode",
    group: "workflowEditorModes",
  },
  /** Annotations */
  {
    hotkey: ["Ctrl", "0"],
    description: "Normal text",
    group: "workflowAnnotations",
  },
  {
    hotkey: ["Ctrl", "ALT", "1 - 6"],
    description: "Headline 1 - 6",
    group: "workflowAnnotations",
  },
  {
    hotkey: ["Ctrl", "B"],
    description: "Bold",
    group: "workflowAnnotations",
  },
  {
    hotkey: ["Ctrl", "I"],
    description: "Italic",
    group: "workflowAnnotations",
  },
  {
    hotkey: ["Ctrl", "U"],
    description: "Underline",
    group: "workflowAnnotations",
  },
  {
    hotkey: ["Ctrl", "Shift", "X"],
    description: "Strikethrough",
    group: "workflowAnnotations",
  },
  {
    hotkey: ["Ctrl", "Shift", "7"],
    description: "Ordered list",
    group: "workflowAnnotations",
  },
  {
    hotkey: ["Ctrl", "Shift", "8"],
    description: "Bullet list",
    group: "workflowAnnotations",
  },
  {
    hotkey: ["Ctrl", "K"],
    description: "Add or edit link",
    group: "workflowAnnotations",
  },
  {
    hotkey: ["Alt", "ArrowDown"],
    description: "Increase height",
    group: "workflowAnnotations",
  },
  {
    hotkey: ["Alt", "ArrowUp"],
    description: "Decrease height",
    group: "workflowAnnotations",
  },
  {
    hotkey: ["Alt", "ArrowLeft"],
    description: "Increase width",
    group: "workflowAnnotations",
  },
  {
    hotkey: ["Alt", "ArrowRight"],
    description: "Decrease width",
    group: "workflowAnnotations",
  },
  /** Workflow editor actions */
  {
    hotkey: ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"],
    description: "Select node inside the quick nodes panel ",
    group: "workflowEditor",
  },
  {
    hotkey: ["Enter"],
    description: "Add node from quick nodes panel",
    group: "workflowEditor",
  },
  {
    hotkey: ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"],
    description: "Moving the selection rectangle to the next element",
    group: "workflowEditor",
  },
  {
    hotkey: [
      "[hold]",
      "Shift",
      "[and press\n\n]",
      "ArrowLeft",
      "[/]",
      "ArrowRight",
      "[/]",
      "ArrowUp",
      "[/]",
      "ArrowDown",
      "[\n\nthen select via]",
      "Enter",
    ],
    description: "Select multiple elements",
    group: "workflowEditor",
  },
  {
    hotkey: ["Ctrl", "Shift", "ArrowUp"],
    description: "Move selected elements up",
    group: "workflowEditor",
  },
  {
    hotkey: ["Ctrl", "Shift", "ArrowDown"],
    description: "Move selected elements down",
    group: "workflowEditor",
  },
  {
    hotkey: ["Ctrl", "Shift", "ArrowRight"],
    description: "Move selected elements right",
    group: "workflowEditor",
  },
  {
    hotkey: ["Ctrl", "Shift", "ArrowLeft"],
    description: "Move selected elements left",
    group: "workflowEditor",
  },
  /** Execution */
  {
    hotkey: ["Ctrl", "Enter"],
    description: "Close dialog and execute node",
    group: "execution",
  },
  /** Node labels */
  {
    hotkey: ["Ctrl", "Enter"],
    description: "Apply changes and leave edit mode",
    group: "nodeLabels",
  },
  /** Canvas navigation */
  {
    hotkey: ["[hold]", "Space", "[and drag]"],
    description: "Pan",
    group: "canvasNavigation",
  },
];

export default otherHotkeys;
