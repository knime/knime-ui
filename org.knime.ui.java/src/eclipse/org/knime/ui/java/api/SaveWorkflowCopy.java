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

import java.io.IOException;
import java.nio.file.Path;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

import org.eclipse.core.runtime.CoreException;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.util.CheckUtils;
import org.knime.core.node.workflow.contextv2.WorkflowContextV2;
import org.knime.core.util.FileUtil;
import org.knime.gateway.impl.project.WorkflowProjectManager;
import org.knime.gateway.impl.webui.AppStateUpdater;
import org.knime.gateway.impl.webui.spaces.Space.NameCollisionHandling;
import org.knime.gateway.impl.webui.spaces.local.LocalWorkspace;
import org.knime.ui.java.api.SpaceDestinationPicker.Operation;
import org.knime.ui.java.util.DesktopAPUtil;
import org.knime.ui.java.util.LocalSpaceUtil;

/**
 * Helper class to save a copy of a project, for instance
 * <ul>
 *     <li>Save an opened remote workflow project locally</li>
 *     <li>Save a copy of a local workflow project under a different name ("Save As...")</li>
 * </ul>
 *
 * opened remote workflow locally
 *
 * @author Kai Franze, KNIME GmbH
 */
final class SaveWorkflowCopy {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(SaveWorkflowCopy.class);

    private SaveWorkflowCopy() {
        // State-less
    }

    /**
     * Save a copy of the provided workflow project. Prompts the user for the save destination.
     * @param projectId The ID identifying the workflow project to save
     * @param workflowSvg The workflow SVG
     * @throws IOException In case the workflow project could not be saved
     */
    static void saveCopyOf(final String projectId, final String workflowSvg) throws IOException {
        final var projectManager = WorkflowProjectManager.getInstance();
        final var workflowProject = projectManager.getWorkflowProject(projectId) //
                .orElseThrow(() -> new NoSuchElementException(
                    String.format("No local workflow path found for <%s>", projectId)));

        final var workflowManager = workflowProject.openProject();
        final var oldContext = CheckUtils.checkArgumentNotNull(workflowManager.getContextV2());
        final var execInfo = oldContext.getExecutorInfo();
        final var srcPath = execInfo.getLocalWorkflowPath();
        final var workflowName = srcPath.getFileName().toString();

        var destPicker = new SpaceDestinationPicker(new String[]{"LOCAL"}, Operation.SAVE, workflowName);
        if (!destPicker.open()) {
            return;
        }

        final var destWorkflowGroupPath = getDestinationWorkflowGroupPath(destPicker);
        if (destWorkflowGroupPath == null) {
            return;
        }
        final var destWorkflowGroupItemId = LocalSpaceUtil.getLocalWorkspace().getItemId(destWorkflowGroupPath);

        var fileName = destPicker.getTextInput();
        final var collisionHandling = getNameCollisionStrategy(fileName, destWorkflowGroupItemId);
        if (collisionHandling == null) {
            return;
        }

        if (collisionHandling == NameCollisionHandling.OVERWRITE
            && areOriginAndDestinationEqual(srcPath, destWorkflowGroupPath, fileName)) {
            SaveWorkflow.saveWorkflow(projectId, workflowSvg, false);
            return;
        }
        var localWorkspace = LocalSpaceUtil.getLocalWorkspace();
        final var newPath = localWorkspace.createWorkflowDir(destWorkflowGroupItemId, fileName, collisionHandling);

        final WorkflowContextV2 newContext = WorkflowContextV2.builder() //
                .withAnalyticsPlatformExecutor(exec -> exec //
                    .withCurrentUserAsUserId() //
                    .withLocalWorkflowPath(newPath) //
                    .withMountpoint(localWorkspace.getId().toUpperCase(Locale.US), localWorkspace.getLocalRootPath()) //
                    .withTempFolder(execInfo.getTempFolder()))
                .withLocalLocation()
                .build();

        final var result = DesktopAPUtil.runWithProgress("Saving workflow", LOGGER, monitor -> // NOSONAR
            SaveWorkflow.saveWorkflowAs(newContext, monitor, workflowManager, workflowSvg));

        if (result.isEmpty() || !result.get().booleanValue()) {
            // saving has failed
            FileUtil.deleteRecursively(newPath.toFile());
        } else {
            if (oldContext.isTemporyWorkflowCopyMode()) {
                FileUtil.deleteRecursively(srcPath.toFile());
            }
            // update the `WorkflowProject` origin
            final var localItemId = localWorkspace.getItemId(newPath);
            final var relativePath = localWorkspace.getLocalRootPath().relativize(newPath).toString();
            final var project = OpenWorkflow.createWorkflowProject(workflowManager,
                LocalSpaceUtil.LOCAL_SPACE_PROVIDER_ID, LocalWorkspace.LOCAL_WORKSPACE_ID, localItemId, relativePath,
                projectId);
            projectManager.addWorkflowProject(projectId, project);
            DesktopAPI.getDeps(AppStateUpdater.class).updateAppState();
        }
    }

    private static boolean areOriginAndDestinationEqual(final Path srcPath, final Path destWorkflowGroupPath,
        final String fileName) {
        final var destPath = destWorkflowGroupPath.resolve(fileName);
        return srcPath.equals(destPath);
    }

    private static Path getDestinationWorkflowGroupPath(final SpaceDestinationPicker picker) {
        final var dest = picker.getSelectedDestination();
        if (dest == null) {
            return null;
        }

        try {
            return dest.getDestination().resolveToLocalFile().toPath();
        } catch (CoreException e) {
            DesktopAPUtil.showWarningAndLogError("Workflow save attempt", "Saving the workflow locally didn't work",
                LOGGER, e);
            return null;
        }
    }

    private static NameCollisionHandling getNameCollisionStrategy(final String fileName,
        final String workflowGroupItemId) {
        var localWorkspace = LocalSpaceUtil.getLocalWorkspace();
        var nameCollisions = NameCollisionChecker//
            .checkForNameCollisionInDir(localWorkspace, fileName, workflowGroupItemId)//
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
