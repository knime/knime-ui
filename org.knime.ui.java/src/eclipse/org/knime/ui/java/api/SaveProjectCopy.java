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

import static org.knime.ui.java.api.SaveProject.saveWorkflowSvg;

import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.util.Locale;
import java.util.NoSuchElementException;

import org.apache.commons.lang3.function.FailableFunction;
import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.IProgressMonitor;
import org.knime.core.node.CanceledExecutionException;
import org.knime.core.node.InvalidSettingsException;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.util.CheckUtils;
import org.knime.core.node.workflow.SubNodeContainer;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.core.node.workflow.contextv2.WorkflowContextV2;
import org.knime.core.util.FileUtil;
import org.knime.core.util.LockFailedException;
import org.knime.gateway.api.webui.entity.ShowToastEventEnt;
import org.knime.gateway.api.webui.entity.SpaceItemReferenceEnt.ProjectTypeEnum;
import org.knime.gateway.impl.project.Project;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.gateway.impl.webui.AppStateUpdater;
import org.knime.gateway.impl.webui.ToastService;
import org.knime.gateway.impl.webui.spaces.Space.NameCollisionHandling;
import org.knime.gateway.impl.webui.spaces.local.LocalWorkspace;
import org.knime.ui.java.api.NameCollisionChecker.UsageContext;
import org.knime.ui.java.api.SpaceDestinationPicker.Operation;
import org.knime.ui.java.util.ClassicWorkflowEditorUtil;
import org.knime.ui.java.util.DesktopAPUtil;
import org.knime.ui.java.util.PerspectiveUtil;
import org.knime.ui.java.util.ProjectFactory;

/**
 * Helper class to save a copy of a project, for instance
 * <ul>
 *     <li>Save an opened remote workflow project locally</li>
 *     <li>Save a copy of a local project under a different name ("Save As...")</li>
 * </ul>
 *
 * Note: the project copy will replace the original one in the {@link ProjectManager}.
 *
 * @author Kai Franze, KNIME GmbH, Germany
 */
final class SaveProjectCopy {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(SaveProjectCopy.class);

    private SaveProjectCopy() {
        // State-less
    }

    /**
     * Save a copy of the provided project. Prompts the user for the save destination.
     *
     * @param projectId The ID identifying the project to save
     * @param projectSVG The project SVG
     * @throws IOException In case the project could not be saved
     */
    static void saveCopyOf(final String projectId, final String projectSVG) {
        final var project = ProjectManager.getInstance()//
            .getProject(projectId) //
            .orElseThrow(() -> {
                final var message = String.format("No local workflow path found for <%s>", projectId);
                return new NoSuchElementException(message);
            });
        final var wfm = project.loadWorkflowManager();
        final var oldContext = CheckUtils.checkArgumentNotNull(wfm.getContextV2());
        try {
            final var newContext = pickDestinationAndGetNewContext(oldContext);

            if (newContext == null) {
                LOGGER.error("No valid destination could be picked");
                return;
            }

            if (newContext.equals(oldContext)) { // Simply overwrite the old project
                SaveProject.saveProject(projectId, projectSVG, false);
                return;
            }

            var localSpace = DesktopAPI.getDeps(LocalWorkspace.class);
            if (wfm.isComponentProjectWFM()) {
                saveAndReplaceComponentProject(oldContext, newContext, wfm, projectId, localSpace);
            } else {
                saveAndReplaceWorkflowProject(oldContext, newContext, wfm, projectId, projectSVG, localSpace);
            }
        } catch (Exception ex) {
            LOGGER.error(ex);
            DesktopAPI.getDeps(ToastService.class).showToast(ShowToastEventEnt.TypeEnum.ERROR, "Save Error",
                ex.getMessage(), false);
        }
    }

    /**
     * @return The new workflow context, identical with the old context if if simply overwrites the old location.
     *         {@code null} if something went wrong with the destination selection.
     *
     */
    private static WorkflowContextV2 pickDestinationAndGetNewContext(final WorkflowContextV2 oldContext)
        throws InvalidPathException, IOException {
        final var srcPath = oldContext.getExecutorInfo().getLocalWorkflowPath();
        final var projectName = srcPath.getFileName().toString();

        final var destPicker = new SpaceDestinationPicker(new String[]{"LOCAL"}, Operation.SAVE, projectName);
        if (!destPicker.open()) {
            LOGGER.error("No destion was picked");
            return null;
        }

        final var destWorkflowGroupPath = getDestinationWorkflowGroupPath(destPicker);
        if (destWorkflowGroupPath == null) {
            LOGGER.error("Could not get destination path");
            return null;
        }

        var localSpace = DesktopAPI.getDeps(LocalWorkspace.class);
        final var destWorkflowGroupItemId = localSpace.getItemId(destWorkflowGroupPath);
        var fileName = destPicker.getTextInput();
        final var collisionHandling = getNameCollisionStrategy(fileName, destWorkflowGroupItemId, localSpace);
        if (collisionHandling == null) {
            LOGGER.error("Name collision handling failed");
            return null;
        }

        if (collisionHandling == NameCollisionHandling.OVERWRITE) {
            final var path = destWorkflowGroupPath.resolve(fileName);
            if (path.equals(srcPath)) {
                return oldContext; // Simply overwrite the current location,
            }
            final var relativePath = localSpace.getLocalRootPath().relativize(path);
            if (DesktopAPI.getDeps(ProjectManager.class).getLocalProject(relativePath).isPresent()) {
                throw new IOException("Project <%s> is opened and can't be overwritten.".formatted(fileName));
            }
        }

        final var newPath = localSpace.createWorkflowDir(destWorkflowGroupItemId, fileName, collisionHandling);
        return WorkflowContextV2.builder() //
            .withAnalyticsPlatformExecutor(exec -> exec //
                .withCurrentUserAsUserId() //
                .withLocalWorkflowPath(newPath) //
                .withMountpoint(localSpace.getId().toUpperCase(Locale.US), localSpace.getLocalRootPath()) //
                .withTempFolder(oldContext.getExecutorInfo().getTempFolder())) //
            .withLocalLocation() //
            .build();
    }

    private static Path getDestinationWorkflowGroupPath(final SpaceDestinationPicker picker) {
        final var dest = picker.getSelectedDestination();
        if (dest == null) {
            return null;
        }
        try {
            return dest.getDestination().resolveToLocalFile().toPath();
        } catch (CoreException e) {
            final var title = "Workflow save attempt";
            final var message = "Saving the workflow locally didn't work";
            DesktopAPUtil.showWarningAndLogError(title, message, LOGGER, e);
            return null;
        }
    }

    private static NameCollisionHandling getNameCollisionStrategy(final String fileName,
        final String workflowGroupItemId, final LocalWorkspace localWorkspace) {
        var nameCollisions = NameCollisionChecker//
            .checkForNameCollisionInDir(localWorkspace, fileName, workflowGroupItemId)//
            .stream()//
            .toList();
        if (nameCollisions.isEmpty()) {
            return NameCollisionHandling.NOOP;
        } else {
            return NameCollisionChecker.openDialogToSelectCollisionHandling(localWorkspace, workflowGroupItemId,
                nameCollisions, UsageContext.SAVE).orElse(null);
        }
    }

    private static void saveAndReplaceWorkflowProject(final WorkflowContextV2 oldContext,
        final WorkflowContextV2 newContext, final WorkflowManager wfm, final String projectId, final String projectSVG,
        final LocalWorkspace localSpace) {
        final var project =
            ProjectFactory.createProject(wfm, newContext, ProjectTypeEnum.WORKFLOW, projectId, localSpace);
        saveAndReplaceProject(oldContext, newContext, project,
            monitor -> saveWorkflowCopy(newContext, monitor, wfm, projectSVG));
    }

    private static void saveAndReplaceComponentProject(final WorkflowContextV2 oldContext,
        final WorkflowContextV2 newContext, final WorkflowManager wfm, final String projectId,
        final LocalWorkspace localSpace) {
        final var project =
            ProjectFactory.createProject(wfm, newContext, ProjectTypeEnum.COMPONENT, projectId, localSpace);
        saveAndReplaceProject(oldContext, newContext, project, monitor -> saveComponentCopy(monitor, wfm, newContext));
    }

    /**
     * Save regular workflow as
     *
     * @param context The context with the information about the new workflow
     * @param monitor The monitor to show the progress of this operation
     * @param wfm The Workflowmanager that will save the workflow
     * @param svg workflow SVG
     */
    private static boolean saveWorkflowCopy(final WorkflowContextV2 context, final IProgressMonitor monitor,
        final WorkflowManager wfm, final String svg) {
        monitor.beginTask("Saving a workflow", IProgressMonitor.UNKNOWN);

        try {
            wfm.saveAs(context, DesktopAPUtil.toExecutionMonitor(monitor));
        } catch (final IOException | CanceledExecutionException | LockFailedException e) {
            DesktopAPUtil.showWarningAndLogError("Workflow save attempt",
                "Saving the workflow didn't work: " + e.getMessage(), LOGGER, e);
            monitor.done();
            return false;
        }
        saveWorkflowSvg(wfm.getName(), svg, context.getExecutorInfo().getLocalWorkflowPath());
        monitor.done();
        return true;
    }

    /**
     * Save component template as
     *
     * @param context The context with the information about the new component
     * @param monitor The monitor to show the progress of this operation
     * @param wfm The workflow manager that will save the component
     * @param svg workflow SVG
     */
    private static boolean saveComponentCopy(final IProgressMonitor monitor, final WorkflowManager wfm,
        final WorkflowContextV2 newContext) {
        monitor.beginTask("Saving a component template", IProgressMonitor.UNKNOWN);
        try {
            final var snc = (SubNodeContainer)wfm.getDirectNCParent();
            final var path = newContext.getExecutorInfo().getLocalWorkflowPath().toFile();
            snc.saveAsTemplate(path, DesktopAPUtil.toExecutionMonitor(monitor));
            wfm.setWorkflowContext(newContext);
            wfm.getNodeContainerDirectory().changeRoot(path);
        } catch (IOException | CanceledExecutionException | LockFailedException | InvalidSettingsException e) {
            final var title = "Component save attempt";
            final var message = "Saving the component didn't work";
            DesktopAPUtil.showWarningAndLogError(title, message, LOGGER, e);
            monitor.done();
            return false;
        }
        monitor.done();
        return true;
    }

    private static void saveAndReplaceProject(final WorkflowContextV2 oldContext, final WorkflowContextV2 newContext,
        final Project project, final FailableFunction<IProgressMonitor, Boolean, InvocationTargetException> saveLogic) {
        final var newPath = newContext.getExecutorInfo().getLocalWorkflowPath();
        final var resultOptional = DesktopAPUtil.runWithProgress("Saving as", LOGGER, saveLogic);

        if (resultOptional.isEmpty() || !resultOptional.get().booleanValue()) { // If saving has failed
            FileUtil.deleteRecursively(newPath.toFile());
        } else {
            if (oldContext.isTemporyWorkflowCopyMode()) { // If saved from a yellow bar editor
                final var execInfo = oldContext.getExecutorInfo();
                final var srcPath = execInfo.getLocalWorkflowPath();
                FileUtil.deleteRecursively(srcPath.toFile());
            }
            ProjectManager.getInstance().addProject(project);
            DesktopAPI.getDeps(AppStateUpdater.class).updateAppState();
        }

        if (PerspectiveUtil.isClassicPerspectiveLoaded()) { // To sync the classic perspective
            final var wfm = project.loadWorkflowManager();
            project.getOrigin().ifPresent(origin -> ClassicWorkflowEditorUtil.updateInputForOpenEditors(origin, wfm,
                DesktopAPI.getDeps(LocalWorkspace.class)));
        }
    }
}
