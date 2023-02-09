/*
 * ------------------------------------------------------------------------
 *
 *  Copyright by KNIME AG, Zurich, Switzerland
 *  Website: http://www.knime.com; Email: contact@knime.com
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License, Version 3, as
 *  published by the Free Software Foundation.
 *
 *  This program is distributed in the hope that it will be useful, but
 *  WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, see <http://www.gnu.org/licenses>.
 *
 *  Additional permission under GNU GPL version 3 section 7:
 *
 *  KNIME interoperates with ECLIPSE solely via ECLIPSE's plug-in APIs.
 *  Hence, KNIME and ECLIPSE are both independent programs and are not
 *  derived from each other. Should, however, the interpretation of the
 *  GNU GPL Version 3 ("License") under any applicable laws result in
 *  KNIME and ECLIPSE being a combined program, KNIME AG herewith grants
 *  you the additional permission to use and propagate KNIME together with
 *  ECLIPSE with only the license terms in place for ECLIPSE applying to
 *  ECLIPSE and the GNU GPL Version 3 applying for KNIME, provided the
 *  license terms of ECLIPSE themselves allow for the respective use and
 *  propagation of ECLIPSE together with KNIME.
 *
 *  Additional permission relating to nodes for KNIME that extend the Node
 *  Extension (and in particular that are based on subclasses of NodeModel,
 *  NodeDialog, and NodeView) and that only interoperate with KNIME through
 *  standard APIs ("Nodes"):
 *  Nodes are deemed to be separate and independent programs and to not be
 *  covered works.  Notwithstanding anything to the contrary in the
 *  License, the License does not apply to Nodes, you are not required to
 *  license Nodes under the License, and you are granted a license to
 *  prepare and propagate Nodes, in each case even if such Nodes are
 *  propagated with or for interoperation with KNIME.  The owner of a Node
 *  may freely choose the license terms applicable to such Node, including
 *  when such Node is propagated with or for interoperation with KNIME.
 * ---------------------------------------------------------------------
 *
 * History
 *   Feb 9, 2023 (kai): created
 */
package org.knime.ui.java.api;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.stream.Collectors;

import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.IProgressMonitor;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.core.node.workflow.contextv2.ExecutorInfo;
import org.knime.core.node.workflow.contextv2.WorkflowContextV2;
import org.knime.gateway.api.webui.entity.SpaceItemEnt;
import org.knime.gateway.impl.project.WorkflowProject;
import org.knime.gateway.impl.project.WorkflowProjectManager;
import org.knime.gateway.impl.webui.spaces.Space.NameCollisionHandling;
import org.knime.ui.java.util.DesktopAPUtil;
import org.knime.ui.java.util.LocalSpaceUtil;
import org.knime.workbench.explorer.view.dialogs.UploadDestinationSelectionDialog.SelectedDestination;

/**
 * Helper class to save an opened remote workflow locally
 *
 * @author Kai Franze, KNIME GmbH
 */
final class SaveRemoteWorkflowLocally {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(SaveRemoteWorkflowLocally.class);

    private SaveRemoteWorkflowLocally() {
        // State-less
    }

    /**
     * Closes a currently open remote workflow and moves it to the 'root' of the local workspace.
     *
     * @param projectId The project ID of the open remote workflow
     * @param workflowPreviewSvg The workflow preview SVG
     *
     * @return The optional origin of the newly created workflow
     */
    static Optional<SpaceItemEnt> saveAndClose(final String projectId, final String workflowPreviewSvg) {
        var srcPath = toAbsolutePath(projectId);

        var workflowGroupItemId = askForDestinationWorkflowGroupAndGetId();
        if (workflowGroupItemId == null) {
            return Optional.empty();
        }

        var collisionHandling = getNameCollisionStrategy(srcPath, workflowGroupItemId);
        if (collisionHandling == null) {
            return Optional.empty();
        }

        SaveWorkflow.saveWorkflow(projectId, workflowPreviewSvg);
        var isClosed = CloseWorkflow.closeWorkflow(projectId, null);
        if (!isClosed) {
            return Optional.empty();
        }

        var spaceItemEnt = DesktopAPUtil.runWithProgress("Save workflow locally", LOGGER,
            monitor -> moveWorkflow(monitor, srcPath, workflowGroupItemId, collisionHandling));
        if (spaceItemEnt.isEmpty()) {
            DesktopAPUtil.showWarning("Failed to save workflow locally",
                "There was an error while trying to make a local copy of the opened workflow");
        }
        return spaceItemEnt;
    }

    private static SpaceItemEnt moveWorkflow(final IProgressMonitor monitor, final Path srcPath,
        final String workflowGroupItemId, final NameCollisionHandling collisionHandling) {
        monitor.beginTask("Begin to move from tmp to local workspace", IProgressMonitor.UNKNOWN);
        try {
            var localWorkspace = LocalSpaceUtil.getLocalWorkspace();
            var spaceItemEnt = localWorkspace.moveItemFromTmp(srcPath, workflowGroupItemId, collisionHandling);
            monitor.done();
            return spaceItemEnt;
        } catch (IOException e) {
            LOGGER.error(String.format("Failed to move workflow at <%s>", srcPath), e);
            monitor.done();
            return null;
        }
    }

    private static String askForDestinationWorkflowGroupAndGetId() {
        var localWorkspace = LocalSpaceUtil.getLocalWorkspace();
        return SpaceDestinationPicker.promptForTargetLocation(new String[]{"LOCAL"})//
            .map(SelectedDestination::getDestination)//
            .map(fileStore -> {
                try {
                    return fileStore.resolveToLocalFile();
                } catch (CoreException e) {
                    DesktopAPUtil.showWarningAndLogError("Workflow save attempt",
                        "Saving the workflow locally didn't work", LOGGER, e);
                    return null;
                }
            })//
            .map(File::toPath)//
            .map(localWorkspace::getItemId)//
            .orElse(null);
    }

    private static Path toAbsolutePath(final String projectId) {
        return WorkflowProjectManager.getInstance().getWorkflowProject(projectId)//
            .map(WorkflowProject::openProject)//
            .map(WorkflowManager::getContextV2)//
            .map(WorkflowContextV2::getExecutorInfo)//
            .map(ExecutorInfo::getLocalWorkflowPath)//
            .orElseThrow(
                () -> new NoSuchElementException(String.format("No local workflow path found for <%s>", projectId)));
    }

    private static NameCollisionHandling getNameCollisionStrategy(final Path srcPath,
        final String workflowGroupItemId) {
        var localWorkspace = LocalSpaceUtil.getLocalWorkspace();
        var nameCollisions = NameCollisionChecker//
            .checkForNameCollisionInDir(localWorkspace, srcPath, workflowGroupItemId)//
            .stream()//
            .collect(Collectors.toList());
        if (nameCollisions.isEmpty()) {
            return NameCollisionHandling.NOOP;
        } else {
            return NameCollisionChecker
                .openDialogToSelectCollisionHandling(localWorkspace, workflowGroupItemId, nameCollisions).orElse(null);
        }
    }

}
