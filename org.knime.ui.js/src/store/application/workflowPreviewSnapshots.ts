import { defineStore } from "pinia";

import { useWorkflowStore } from "@/store/workflow/workflow";
import { encodeString } from "@/util/encodeString";
import { generateWorkflowPreview } from "@/util/generateWorkflowPreview";
import { getKanvasDomElement } from "@/util/getKanvasDomElement";

import { useApplicationStore } from "./application";

type WorkflowPreviewSnapshotsState = {
  // Map that keeps track of root workflow snapshots. Used as SVGs when saving
  rootWorkflowSnapshots: Map<string, string | null>;
};

export const useWorkflowPreviewSnapshotsStore = defineStore(
  "workflowPreviewSnapshots",
  {
    state: (): WorkflowPreviewSnapshotsState => ({
      rootWorkflowSnapshots: new Map(),
    }),
    actions: {
      updatePreviewSnapshot({
        isChangingProject,
        newWorkflow,
      }: {
        isChangingProject: boolean;
        newWorkflow: { projectId: string; workflowId?: string } | null;
      }) {
        const isCurrentlyOnRoot =
          useWorkflowStore()?.activeWorkflow?.info.containerId === "root";
        const isWorkflowUnsaved = useWorkflowStore()?.activeWorkflow?.dirty;

        const { activeProjectId } = useApplicationStore();

        // Going from the root into deeper levels (e.g into a Metanode or Component)
        // without having changed projects
        const isEnteringSubWorkflow =
          isCurrentlyOnRoot && newWorkflow && !isChangingProject;

        if (isEnteringSubWorkflow || (isChangingProject && isWorkflowUnsaved)) {
          const canvasElement = getKanvasDomElement()
            ?.firstChild as SVGSVGElement;

          // save a snapshot of the current state of the root workflow
          this.addToRootWorkflowSnapshots({
            projectId: activeProjectId!,
            element: canvasElement,
            isCanvasEmpty: useWorkflowStore().isWorkflowEmpty,
          });

          return;
        }

        // Going back to the root of a workflow without having changed projects
        const isGoingBackToRoot = newWorkflow?.workflowId === "root";
        if (!isCurrentlyOnRoot && isGoingBackToRoot && !isChangingProject) {
          // Since we're back in the root workflow, we can clear the previously saved snapshot
          this.removeFromRootWorkflowSnapshots({
            projectId: activeProjectId!,
          });
        }
      },

      async addToRootWorkflowSnapshots({
        projectId,
        element,
        isCanvasEmpty,
      }: {
        projectId: string;
        element: SVGSVGElement;
        isCanvasEmpty: boolean;
      }) {
        // always use the "root" workflow
        const snapshotKey = encodeString(`${projectId}--root`);
        this.rootWorkflowSnapshots.set(
          snapshotKey,
          await generateWorkflowPreview(element, isCanvasEmpty),
        );
      },

      removeFromRootWorkflowSnapshots({ projectId }: { projectId: string }) {
        this.rootWorkflowSnapshots.delete(encodeString(`${projectId}--root`));
      },

      getRootWorkflowSnapshotByProjectId({ projectId }: { projectId: string }) {
        const snapshotKey = encodeString(`${projectId}--root`);

        return this.rootWorkflowSnapshots.get(snapshotKey) ?? "";
      },

      async getActiveWorkflowSnapshot(): Promise<string> {
        const {
          projectId,
          info: { containerId },
        } = useWorkflowStore().activeWorkflow!;

        const isRootWorkflow = containerId === "root";

        const preview = isRootWorkflow
          ? await generateWorkflowPreview(
              getKanvasDomElement()?.firstChild as SVGSVGElement,
              useWorkflowStore().isWorkflowEmpty,
            )
          : // when we're on a nested workflow (metanode/component) we then need to use the saved snapshot
            this.getRootWorkflowSnapshotByProjectId({ projectId });

        return preview ?? "";
      },
    },
  },
);
