/* eslint-disable one-var */
/* eslint-disable func-style */
import { getLocation, visit } from "jsonc-parser";
import * as monaco from "monaco-editor";

function createErrorMarkerFromOffset(
  model: monaco.editor.ITextModel,
  offset: number,
  length: number,
  message: string,
): monaco.editor.IMarkerData {
  const start = model.getPositionAt(offset);
  const end = model.getPositionAt(offset + Math.max(1, length));
  return {
    severity: monaco.MarkerSeverity.Error,
    message,
    startLineNumber: start.lineNumber,
    startColumn: start.column,
    endLineNumber: end.lineNumber,
    endColumn: end.column,
  };
}

export const useDuplicateNodeIdValidation = () => {
  const seenIds = new Set<string>();
  let markers: monaco.editor.IMarkerData[];
  let duplicates: Array<{ offset: number; length: number; value: string }>;

  function validateDuplicateNodeIds(
    text: string,
    model: monaco.editor.ITextModel,
  ) {
    markers = [];
    duplicates = [];
    seenIds.clear();

    visit(
      text,
      {
        onLiteralValue: (value, offset, length) => {
          const location = getLocation(text, offset);
          if (!location.path.includes("nodeID") || !location.previousNode) {
            return;
          }

          if (seenIds.has(value)) {
            duplicates.push({ offset, length, value });
          } else {
            seenIds.add(value);
          }
        },
      },
      { allowTrailingComma: true, disallowComments: false },
    );

    for (const item of duplicates) {
      const marker = createErrorMarkerFromOffset(
        model,
        item.offset,
        item.length,
        `Duplicate nodeID "${item.value}"`,
      );
      markers.push(marker);
    }

    return markers;
  }

  return { validateDuplicateNodeIds };
};
