<!-- eslint-disable func-style -->
<!-- eslint-disable one-var -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from "vue";
import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import JSONWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import { storeToRefs } from "pinia";
import "monaco-editor/esm/vs/language/json/monaco.contribution";
import "monaco-editor/esm/vs/editor/contrib/folding/browser/folding";
import "monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestController";
import rafThrottle from "raf-throttle";
import {
  Diagnostic,
  type LanguageService,
  TextDocument,
  getLanguageService,
} from "vscode-json-languageservice";

import CircleCloseFilledIcon from "@knime/styles/img/icons/circle-close.svg";

import { useLayoutEditorStore } from "@/store/layoutEditor/layoutEditor";

import schema from "./schema.json";
import { useDuplicateNodeIdValidation } from "./useDuplicateNodeIdValidation";

const editorElementRef = useTemplateRef("editorRef");

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === "json") {
      return new JSONWorker();
    }

    return new EditorWorker();
  },
};

const layoutEditorStore = useLayoutEditorStore();
const { layout, nodes, advancedEditorData } = storeToRefs(layoutEditorStore);

let modelUri: monaco.Uri;
let model: monaco.editor.ITextModel;
let editorInstance: monaco.editor.IStandaloneCodeEditor;
let disposables: monaco.IDisposable[] = [];
let jsonLanguageService: LanguageService;

const schemaValidationIssues = ref<Diagnostic[]>([]);
const duplicateNodeIssues = ref<Diagnostic[]>([]);
const isInvalidContent = computed(
  () =>
    schemaValidationIssues.value.length > 0 ||
    duplicateNodeIssues.value.length > 0,
);

const getJSONSchema = () => {
  if (!modelUri) {
    throw new Error("Tried to get JSON schema before creating model");
  }

  return {
    // this is not a real uri. it's just used as an identifier for this
    // schema but there's no fetching involved
    uri: "http://org.knime.ui/layout-editor-schema.json",
    fileMatch: [modelUri.toString()],
    schema,
  };
};

const { validateDuplicateNodeIds } = useDuplicateNodeIdValidation();

const runSchemaValidation = async (content: string) => {
  if (!jsonLanguageService) {
    consola.error(
      "Failed to run JSON Schema validation. Language service not available",
    );
    return;
  }

  const textDocument = TextDocument.create(
    model.uri.toString(),
    "json",
    model.getVersionId(),
    content,
  );

  const jsonDocument = jsonLanguageService.parseJSONDocument(textDocument);

  const diagnostics = await jsonLanguageService.doValidation(
    textDocument,
    jsonDocument,
  );

  advancedEditorData.value.validity =
    diagnostics.length === 0 ? "valid" : "invalid";
  schemaValidationIssues.value = diagnostics;
};

const runNodeIdValidation = (content: string) => {
  const markers = validateDuplicateNodeIds(content, model);

  // set custom markers just for the node id
  monaco.editor.setModelMarkers(model, "node-id-rules", markers);

  duplicateNodeIssues.value = [];

  if (markers.length > 0) {
    advancedEditorData.value.validity = "invalid";
  }

  // use markers to also create issues to display in bottom panel
  // because these are custom markers which monaco itself doens't produce
  // so they don't show up unless explicitly added
  for (const marker of markers) {
    duplicateNodeIssues.value.push({
      message: marker.message,
      range: {
        start: {
          character: marker.startColumn - 1,
          line: marker.startLineNumber - 1,
        },
        end: {
          character: marker.endColumn,
          line: marker.endLineNumber,
        },
      },
    });
  }
};

const initializeEditor = () => {
  schema.definitions.NodeId.enum = nodes.value.map(({ nodeID }) => nodeID);

  const initialContent =
    layoutEditorStore.advancedEditorData.contentDraft ??
    JSON.stringify(layout.value, null, 2);

  modelUri = monaco.Uri.parse("file://layout-editor.json");
  model = monaco.editor.createModel(initialContent, "json", modelUri);
  advancedEditorData.value.contentDraft = initialContent;

  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    schemas: [getJSONSchema()],
  });

  editorInstance = monaco.editor.create(editorElementRef.value!, {
    model,
    language: "json",
    scrollBeyondLastLine: false,
    lineNumbersMinChars: 1,
    automaticLayout: true,
    minimap: { enabled: false },
    fontFamily: "Roboto Mono",
    fontWeight: "400",
  });

  disposables.push(
    editorInstance.onDidChangeModelContent(() => {
      if (!advancedEditorData.value.dirty) {
        advancedEditorData.value.dirty = true;
      }

      advancedEditorData.value.validity = "checking";
    }),
  );

  // debounce validation and content draft update
  disposables.push(
    editorInstance.onDidChangeModelContent(
      rafThrottle(async () => {
        advancedEditorData.value.contentDraft = model.getValue();

        await runSchemaValidation(advancedEditorData.value.contentDraft);
        runNodeIdValidation(advancedEditorData.value.contentDraft);
      }),
    ),
  );

  disposables.push(editorInstance);
  disposables.push(model);
};

// Monaco's validation and problem detection runs in a webworker asynchronously
// and unfortunately doesn't report back when no problems are found. Since we want
// to make sure the user doesn't exit the editor in an invalid state we have to make sure
// a transition from invalid -> valid is properly handled. For this reason, we have to run validation
// manually on demand
const initializeJSONLanguageService = () => {
  jsonLanguageService = getLanguageService({
    schemaRequestService: (_uri) => {
      throw new Error("fetch should not be used");
    },
  });

  jsonLanguageService.configure({
    allowComments: false,
    schemas: [getJSONSchema()],
  });
};

const goToLine = (lineNumber: number, column: number) => {
  editorInstance.setPosition({ lineNumber, column });
  editorInstance.revealPosition(
    { lineNumber, column },
    monaco.editor.ScrollType.Smooth,
  );
  editorInstance.focus();
};

onMounted(() => {
  initializeEditor();
  initializeJSONLanguageService();
  // run an initial validation, in case the previous content is now invalid
  runSchemaValidation(model.getValue());
});

onUnmounted(() => {
  layoutEditorStore.setLayoutContentFromAdvancedEditor();

  disposables.forEach((d) => d.dispose());
});
</script>

<template>
  <div :class="['wrapper', { invalid: isInvalidContent }]">
    <div id="advanced-layout-editor" ref="editorRef" class="editor-root" />
    <div class="problems">
      <template v-if="isInvalidContent">
        <button
          v-for="(problem, index) in [
            ...schemaValidationIssues,
            ...duplicateNodeIssues,
          ]"
          :key="index"
          class="problem"
          @click="
            goToLine(
              problem.range.start.line + 1,
              problem.range.start.character + 1,
            )
          "
        >
          <CircleCloseFilledIcon class="icon" />
          <span class="message">{{ problem.message }}</span>
          <span class="location"
            >[Ln {{ problem.range.start.line + 1 }}, Col
            {{ problem.range.start.character + 1 }}]</span
          >
        </button>
      </template>
      <span v-else class="no-problems"> No problems found </span>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.wrapper {
  height: 100%;
  overflow: hidden;
  background: var(--knime-gray-light-semi);
  padding: var(--space-8);
  display: grid;
  grid-template-rows: 4fr 1fr;
  gap: 1rem;
  --editor-border: var(--knime-silver-sand);

  &.invalid {
    --editor-border: var(--knime-error-red);
  }

  & .editor-root {
    border: 1px solid var(--editor-border);
  }

  & .problems {
    border: 1px solid var(--knime-silver-sand);
    padding: var(--space-6);
    font-size: 14px;
    overflow-y: auto;

    & .problem {
      cursor: pointer;
      display: flex;
      border: none;
      appearance: none;
      width: 100%;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-4);

      &:hover {
        background: var(--knime-silver-sand);
      }
    }

    & .icon {
      stroke: var(--knime-error-red);

      @mixin svg-icon-size 16;
    }

    & .no-problems {
      font-style: italic;
    }
  }
}
</style>

<style lang="postcss">
#advanced-layout-editor {
  /* disable "View problem" action in hover provider */
  & .monaco-editor .hover-row.status-bar {
    display: none;
  }
}
</style>
