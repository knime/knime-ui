import type { HintConfiguration } from "@knime/components";

export const HINTS = Object.freeze({
  NEW_WORKFLOW: "create-workflow",
  HIGHLIGHTED_OUTPUT_PORT: "highlighted-output-port",
  HELP: "help",
  K_AI: "k-ai",
  NODE_MONITOR: "node-monitor",
});

type HintKeys = keyof typeof HINTS;
type HintValues = (typeof HINTS)[HintKeys];

export const HINT_CONFIGURATIONS: Record<HintValues, HintConfiguration> =
  Object.freeze({
    [HINTS.NEW_WORKFLOW]: {
      title: "Create your first workflow",
      description:
        "A workflow is based on nodes that perform sequential steps performed on data from left to right. Nodes allow you to pull in data from multiple sources, build analyses, create visualizations, and even automate processes.",
      hideButtons: true,
      video: [
        {
          source: "/videos/5-4-Explain-Workflow.webm",
          type: "video/webm",
        },
      ],
      dependsOn: [],
      side: "bottom",
      align: "end",
    },
    [HINTS.HIGHLIGHTED_OUTPUT_PORT]: {
      title: "Add and connect nodes to  perform actions on data visually",
      description:
        'To perform an action on your data, drop the output port of a node to add and connect another node, e.g. the "Column Filter" node via the quick nodes adding panel.',
      dependsOn: [HINTS.NEW_WORKFLOW],
      video: [
        {
          source: "/videos/5-4-Build-Mode-Small-Workflow.webm",
          type: "video/webm",
        },
      ],
      hideButtons: true,
      side: "bottom",
      align: "end",
    },
    [HINTS.K_AI]: {
      title: "Get guidance from KNIME's AI assistant",
      description:
        "K-AI can support you in building workflows, supporting your onboarding process by answering questions. In build mode, K-AI can directly build new workflows for you based on your text input.",
      dependsOn: [HINTS.HIGHLIGHTED_OUTPUT_PORT],
      referenceSelector: ".k-ai-tab",
      video: [
        {
          source: "/videos/5-4-KAI-Building-Mode.webm",
          type: "video/webm",
        },
      ],
      hideButtons: true,
      side: "right",
      align: "center",
    },
    [HINTS.HELP]: {
      title: "Find more resources via “Help”",
      description:
        "Get quick access to resources like our self-paced courses, forum, cheat sheets, documentation, keyboard shortcuts and lots of examples on our Hub.",
      dependsOn: [HINTS.NODE_MONITOR],
      hideButtons: true,
    },
    [HINTS.NODE_MONITOR]: {
      title: "Get instant insights via the node monitor",
      description:
        "See directly the current output of a node as a table after execution. This allows you to quickly verify the results of the actions you did on your data.",
      dependsOn: [HINTS.K_AI],
      hideButtons: true,
      side: "top",
      align: "start",
    },
  });
