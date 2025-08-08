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
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.function.Consumer;

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
import org.knime.gateway.api.service.GatewayException;
import org.knime.gateway.api.webui.entity.ShowToastEventEnt;
import org.knime.gateway.api.webui.entity.SpaceProviderEnt;
import org.knime.gateway.api.webui.service.util.MutableServiceCallException;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.LoggedOutException;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.NetworkException;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.OperationNotAllowedException;
import org.knime.gateway.impl.project.Origin;
import org.knime.gateway.impl.project.Project;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.gateway.impl.webui.ToastService;
import org.knime.gateway.impl.webui.spaces.Space.NameCollisionHandling;
import org.knime.gateway.impl.webui.spaces.SpaceProvider;
import org.knime.gateway.impl.webui.spaces.local.LocalSpace;
import org.knime.ui.java.api.NameCollisionChecker.UsageContext;
import org.knime.ui.java.api.SpaceDestinationPicker.Operation;
import org.knime.ui.java.util.DesktopAPUtil;
import org.knime.ui.java.util.DesktopAPUtil.FunctionWithProgress;

/**
 * Helper class to save a copy of a project, for instance
 * <ul>
 * <li>Save an opened remote workflow project locally</li>
 * <li>Save a copy of a local project under a different name ("Save As...")</li>
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
     * @param sourceProjectId The ID identifying the project to save
     * @param projectSVG The project SVG
     */
    static void saveCopyOf(final String sourceProjectId) throws GatewayException {
        final var originalProject = DesktopAPI.getDeps(ProjectManager.class)//
            .getProject(sourceProjectId) //
            .orElseThrow(() -> {
                final var message = String.format("Project <%s> does not exist", sourceProjectId);
                return new NoSuchElementException(message);
            });
        final var sourceWfm = originalProject.getWorkflowManagerIfLoaded() //
            .orElseThrow(() -> new NoSuchElementException("Project is not loaded"));
        final var oldContext = CheckUtils.checkArgumentNotNull(sourceWfm.getContextV2());
        try {
            final var newContext = pickDestinationAndGetNewContext(oldContext);
            if (newContext == null) {
                LOGGER.error("No valid destination could be picked");
                return;
            }
            if (newContext.equals(oldContext)) { // Simply overwrite the old project
                SaveProject.saveProject(sourceProjectId, false);
                return;
            }

            var updatedWfm = withCleanup(oldContext, newContext, monitor -> {
                if (sourceWfm.isComponentProjectWFM()) {
                    return componentSaveAs(monitor, sourceWfm, newContext);
                } else {
                    return workflowSaveAs(newContext, monitor, sourceWfm);
                }
            });
            var updatedProject = Project.of( //
                originalProject, //
                updatedWfm.getName(), //
                Origin.of(updatedWfm, DesktopAPI.getSpaceProviders()) //
            );
            // Provider type can only be Local here
            OpenProject.registerProjectAndSetActive(updatedProject, SpaceProviderEnt.TypeEnum.LOCAL);
        } catch (final MutableServiceCallException e) { // NOSONAR exception is being promoted
            throw e.toGatewayException("Failed to save workflow copy");
        } catch (GatewayException e) {
            throw e;
        } catch (Exception ex) {
            LOGGER.error(ex);
            DesktopAPI.getDeps(ToastService.class).showToast(ShowToastEventEnt.TypeEnum.ERROR, "Save Error",
                ex.getMessage(), false);
        }
    }

    /**
     * @return The new workflow context, identical with the old context if it simply overwrites the old location.
     *         {@code null} if something went wrong with the destination selection.
     */
    private static WorkflowContextV2 pickDestinationAndGetNewContext(final WorkflowContextV2 oldContext)
        throws NetworkException, LoggedOutException, OperationNotAllowedException, MutableServiceCallException {

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

        var localSpace = DesktopAPI.getDeps(LocalSpace.class);
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

            var openProject = DesktopAPI.getDeps(ProjectManager.class).getProject( //
                SpaceProvider.LOCAL_SPACE_PROVIDER_ID, //
                localSpace.getId(), //
                localSpace.getItemId(path) //
            );
            if (openProject.isPresent()) {
                throw OperationNotAllowedException.builder() //
                    .withTitle("Failed to overwrite project") //
                    .withDetails("Project <%s> is opened and cannot be overwritten.".formatted(fileName)) //
                    .canCopy(false) //
                    .build();
            }
        }

        final var newPath = localSpace.createWorkflowDir(destWorkflowGroupItemId, fileName, collisionHandling);
        return WorkflowContextV2.builder() //
            .withAnalyticsPlatformExecutor(exec -> exec //
                .withCurrentUserAsUserId() //
                .withLocalWorkflowPath(newPath) //
                .withMountpoint(localSpace.getId().toUpperCase(Locale.US), localSpace.getRootPath()) //
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
        final String workflowGroupItemId, final LocalSpace localSpace)
        throws NetworkException, LoggedOutException, MutableServiceCallException {

        if (localSpace.containsItemWithName(workflowGroupItemId, fileName)) {
            return NameCollisionChecker.openDialogToSelectCollisionHandling(localSpace, workflowGroupItemId,
                List.of(fileName), UsageContext.SAVE).orElse(null);
        } else {
            return NameCollisionHandling.NOOP;
        }
    }

    /**
     * Perform Save-As on the given workflow. This will change the state of the given instance.
     *
     * @param context The context with the information about the new workflow
     * @param monitor The monitor to show the progress of this operation
     * @param wfm The same instance, potentially modified.
     *
     * @return The saved workflow manager or {@code null} if the save operation failed
     */
    private static WorkflowManager workflowSaveAs(final WorkflowContextV2 context, final IProgressMonitor monitor,
        final WorkflowManager wfm) {
        monitor.beginTask("Saving a workflow", IProgressMonitor.UNKNOWN);
        try {
            wfm.saveAs(context, DesktopAPUtil.toExecutionMonitor(monitor));
        } catch (final IOException | CanceledExecutionException | LockFailedException e) {
            DesktopAPUtil.showWarningAndLogError("Workflow save attempt",
                "Saving the workflow didn't work: " + e.getMessage(), LOGGER, e);
            monitor.done();
            return null;
        }
        monitor.done();
        return wfm;
    }

    /**
     * Perform Save-As on the given component.
     *
     * @param newContext The context with the information about the new component
     * @param monitor The monitor to show the progress of this operation
     * @param wfm The workflow manager that will save the component
     *
     * @return The saved workflow manager or {@code null} if the save operation failed
     */
    private static WorkflowManager componentSaveAs(final IProgressMonitor monitor, final WorkflowManager wfm,
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
            return null;
        }
        monitor.done();
        return wfm;
    }

    private static WorkflowManager withCleanup(final WorkflowContextV2 oldContext, final WorkflowContextV2 newContext,
        final FunctionWithProgress<WorkflowManager> saveLogic)
        throws NoSuchElementException  {
        final Consumer<WorkflowManager> successHandler = wfm -> {
            if (oldContext.isTemporyWorkflowCopyMode()) { // If saved from a yellow bar editor
                final var execInfo = oldContext.getExecutorInfo();
                final var srcPath = execInfo.getLocalWorkflowPath();
                FileUtil.deleteRecursively(srcPath.toFile());
            }
        };

        final Runnable errorHandler = () -> {
            final var newPath = newContext.getExecutorInfo().getLocalWorkflowPath();
            FileUtil.deleteRecursively(newPath.toFile());
        };

        var savedWfm = DesktopAPUtil.runWithProgress("Saving as", LOGGER, saveLogic);
        savedWfm.ifPresentOrElse(successHandler, errorHandler);
        return savedWfm.orElseThrow();
    }

}
