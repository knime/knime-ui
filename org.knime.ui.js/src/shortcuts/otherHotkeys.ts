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
    hotkey: ["CtrlOrCmd", "C"],
    description: "Copy selected table cells",
    group: "general",
  },
  {
    hotkey: ["CtrlOrCmd", "Shift", "F"],
    description: "Activate the filter input field",
    group: "general",
  },
  {
    hotkey: ["CtrlOrCmd", "Shift", "C"],
    description: "Copy selected table cells and corresponding header",
    group: "general",
  },
  /** general */
  {
    hotkey: ["Esc"],
    description: "Close any unsaved dialog",
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
    hotkey: ["CtrlOrCmd", "0"],
    description: "Normal text",
    group: "workflowAnnotations",
  },
  {
    hotkey: ["CtrlOrCmd", "ALT", "1 - 6"],
    description: "Headline 1 - 6",
    group: "workflowAnnotations",
  },
  {
    hotkey: ["CtrlOrCmd", "B"],
    description: "Bold",
    group: "workflowAnnotations",
  },
  {
    hotkey: ["CtrlOrCmd", "I"],
    description: "Italic",
    group: "workflowAnnotations",
  },
  {
    hotkey: ["CtrlOrCmd", "U"],
    description: "Underline",
    group: "workflowAnnotations",
  },
  {
    hotkey: ["CtrlOrCmd", "Shift", "S"],
    description: "Strikethrough",
    group: "workflowAnnotations",
  },
  {
    hotkey: ["CtrlOrCmd", "Shift", "7"],
    description: "Ordered list",
    group: "workflowAnnotations",
  },
  {
    hotkey: ["CtrlOrCmd", "Shift", "8"],
    description: "Bullet list",
    group: "workflowAnnotations",
  },
  {
    hotkey: ["CtrlOrCmd", "K"],
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
    description: "Move the selection rectangle to the next element",
    group: "workflowEditor",
  },
  {
    hotkey: [
      { text: "hold" },
      "Shift",
      { text: "and press\n" },
      "ArrowLeft",
      { text: "/" },
      "ArrowRight",
      { text: "/" },
      "ArrowUp",
      { text: "/" },
      "ArrowDown",
      { text: "\nthen select via" },
      "Enter",
    ],
    description: "Select multiple elements",
    group: "workflowEditor",
  },
  {
    hotkey: ["CtrlOrCmd", "Shift", "ArrowUp"],
    description: "Move selected elements up",
    group: "workflowEditor",
  },
  {
    hotkey: ["CtrlOrCmd", "Shift", "ArrowDown"],
    description: "Move selected elements down",
    group: "workflowEditor",
  },
  {
    hotkey: ["CtrlOrCmd", "Shift", "ArrowRight"],
    description: "Move selected elements right",
    group: "workflowEditor",
  },
  {
    hotkey: ["CtrlOrCmd", "Shift", "ArrowLeft"],
    description: "Move selected elements left",
    group: "workflowEditor",
  },
  /** Execution */
  {
    hotkey: ["CtrlOrCmd", "Enter"],
    description: "Close dialog and execute node",
    group: "execution",
  },
  /** Selected node actions */
  {
    hotkey: ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"],
    description: "Move port selection",
    group: "selectedNode",
  },
  /** Node labels */
  {
    hotkey: ["CtrlOrCmd", "Enter"],
    description: "Apply label changes and leave edit mode",
    group: "selectedNode",
  },
  /** Canvas navigation */
  {
    hotkey: [{ text: "hold" }, "Space", { text: "and drag" }],
    description: "Pan",
    group: "canvasNavigation",
  },
];

export default otherHotkeys;
