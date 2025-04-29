export const annotationBringToFront = (messageObject: any) => {
  const matcher = () =>
    messageObject.params.workflowCommand.kind ===
      "reorder_workflow_annotations" &&
    messageObject.params.workflowCommand.action === "bring_to_front";

  const response = () => ({
    eventType: "WorkflowChangedEvent",
    payload: {
      patch: {
        ops: [
          {
            value: "<p>This is another annotation</p>",
            path: "/workflowAnnotations/0/text/value",
            op: "replace",
          },
          {
            value: 605,
            path: "/workflowAnnotations/0/bounds/x",
            op: "replace",
          },
          {
            value: 50,
            path: "/workflowAnnotations/0/bounds/y",
            op: "replace",
          },
          {
            value: 365,
            path: "/workflowAnnotations/0/bounds/width",
            op: "replace",
          },
          {
            value: 425,
            path: "/workflowAnnotations/0/bounds/height",
            op: "replace",
          },
          {
            value: "root_1",
            path: "/workflowAnnotations/0/id",
            op: "replace",
          },
          {
            value: "#FFD800",
            path: "/workflowAnnotations/0/borderColor",
            op: "replace",
          },
          {
            value:
              '<p><strong>Read and arrange parts of the Excel sheet</strong></p><ul><li><p>Extract column headers from other than the top row</p></li><li><p>Shift data entered into a wrong cell</p></li><li><p>Remove rows without information</p></li></ul><h5>Extract column headers from</h5><hr><h5><s>than</s> the top row...</h5><ol><li><p style="text-align: left">Shift data entered <strong>into</strong> a <s>wrong</s> cell</p></li><li><p style="text-align: left">Remove rows <em>without</em> <u>information</u></p></li></ol><p style="text-align: left"><a target="_blank" rel="ugc noopener noreferrer nofollow" href="https://www.getemojis.net/emoji/see-no-evil-monkey/" draggable="false" title="Affe - Augen zu">🙈 </a><a target="_blank" rel="ugc noopener noreferrer nofollow" href="https://www.getemojis.net/emoji/monkey-face/" draggable="false" title="Affe - Gesicht">🐵 </a><a target="_blank" rel="ugc noopener noreferrer nofollow" href="https://www.getemojis.net/emoji/speak-no-evil-monkey/" draggable="false" title="Affe - Mund zu">🙊 </a><a target="_blank" rel="ugc noopener noreferrer nofollow" href="https://www.getemojis.net/emoji/hear-no-evil-monkey/" draggable="false" title="Affe - Ohren zu">🙉 -&gt; </a><a target="_blank" rel="ugc noopener noreferrer nofollow" href="https://www.getemojis.net/emoji/fearful-face/" draggable="false" title="ängstliches Gesicht">😨 </a><a target="_blank" rel="ugc noopener noreferrer nofollow" href="https://www.getemojis.net/emoji/winking-face/" draggable="false" title="augenzwinkerndes Gesicht">😉</a></p><p style="text-align: left"></p><h2 style="text-align: left">Test</h2><p style="text-align: left"></p><p style="text-align: right"><a target="_blank" rel="ugc noopener noreferrer nofollow" href="https://example.com" draggable="false" title="Use &quot;Ctrl + click&quot; to follow link">Something</a>. ÖÄÜß</p>',
            path: "/workflowAnnotations/1/text/value",
            op: "replace",
          },
          {
            value: 330,
            path: "/workflowAnnotations/1/bounds/x",
            op: "replace",
          },
          {
            value: 150,
            path: "/workflowAnnotations/1/bounds/y",
            op: "replace",
          },
          {
            value: 545,
            path: "/workflowAnnotations/1/bounds/width",
            op: "replace",
          },
          {
            value: 425,
            path: "/workflowAnnotations/1/bounds/height",
            op: "replace",
          },
          {
            value: "root_0",
            path: "/workflowAnnotations/1/id",
            op: "replace",
          },
          {
            value: "#3CB44B",
            path: "/workflowAnnotations/1/borderColor",
            op: "replace",
          },
        ],
      },
    },
  });

  return { matcher, response };
};
