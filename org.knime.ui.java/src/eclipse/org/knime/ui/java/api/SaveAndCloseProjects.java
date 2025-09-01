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
 *   Jan 12, 2023 (hornm): created
 */
package org.knime.ui.java.api;

import static org.knime.ui.java.util.DesktopAPUtil.assertUiThread;

import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.jface.dialogs.IDialogConstants;
import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.ui.PlatformUI;
import org.eclipse.ui.progress.IProgressService;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.core.ui.util.SWTUtilities;
import org.knime.gateway.api.service.GatewayException;
import org.knime.gateway.impl.project.Project;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.gateway.impl.webui.AppStateUpdater;

/**
 * Called save and close all the projects specified as parameter.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public final class SaveAndCloseProjects {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(SaveAndCloseProjects.class);

    private SaveAndCloseProjects() {
        // utility
    }

    /**
     * Saves and closes the projects represented by the given project-ids. Project-ids that don't reference an opened
     * workflow will just be ignored.
     *
     * @param projectIds Array containing the project-ids of the projects to save
     * @param progressService Displays the progress
     * @throws GatewayException -
     * @throws SaveAndCloseProjectsException -
     */
    static void saveAndCloseProjects(final String[] projectIds, final IProgressService progressService)
        throws SaveAndCloseProjectsException { // NOSONAR
        final var firstFailure = new AtomicReference<Optional<String>>();
        saveProjectsWithProgressBar(projectIds, firstFailure, progressService);

        final var optFailure = firstFailure.get();
        if (optFailure != null && optFailure.isPresent()) { // NOSONAR
            final var projectId = optFailure.get();

            // Make the first project active which couldn't be saved
            ProjectManager.getInstance().setProjectActive(projectId);
            DesktopAPI.getDeps(AppStateUpdater.class).updateAppState();
            throw new SaveAndCloseProjectsException(
                "Could not save and close projects <%s>, since at least saving and closing <%s> failed"
                    .formatted(Arrays.asList(projectIds), projectId));
        }
     }

    /**
     * Resulting state of a save-and-close process.
     */
    public enum State {
            /**
             * The closing process has been cancelled or has failed
             */
            CANCEL_OR_FAIL,

            /**
             * Projects were saved successfully (or did not need to be saved)
             */
            SUCCESS
    }

    /**
     * Closes the given projects (project-ids) and asks the user to save the projects with unsaved changes. Also asks
     * the user to cancel executing projects. If the user doesn't want to save the projects, it just closes them. If the
     * user aborts, nothing will be done.
     *
     * @param projectIds list of projects to close
     * @return The projects state from this function
     */
    public static State saveAndCloseProjectsInteractively(final List<String> projectIds) {
        var projectManager = ProjectManager.getInstance();
        final List<WorkflowManager> dirtyWfms = new ArrayList<>();
        for (final var id : projectIds) {
            projectManager.getProject(id).flatMap(Project::getWorkflowManagerIfLoaded).ifPresent(wfm -> {
                if (wfm.isDirty()) {
                    dirtyWfms.add(wfm);
                }
            });
        }
        var shallSaveProjects = promptWhetherToSaveProjects(dirtyWfms);
        return switch (shallSaveProjects) {
            case YES -> { // NOSONAR
                assertUiThread();
                if (promptCancelExecution(dirtyWfms)) {
                    var progressService = PlatformUI.getWorkbench().getProgressService();
                    try {
                        saveAndCloseProjects(projectIds.toArray(String[]::new), progressService);
                    } catch (SaveAndCloseProjectsException e) {
                        LOGGER.error(e);
                        yield State.CANCEL_OR_FAIL;
                    }
                }
                yield State.SUCCESS;
            }
            case NO -> {
                CloseProject.closeProjects(projectIds);
                yield State.SUCCESS;
            }
            default -> State.CANCEL_OR_FAIL;
        };
    }

    /**
     * Saves all projects for the given ids.
     *
     * @param projectIds id of the projects to save
     * @param firstFailure the first id of the project that couldn't be saved
     * @param progressService
     */
    public static void saveProjectsWithProgressBar(final String[] projectIds,
        final AtomicReference<Optional<String>> firstFailure, final IProgressService progressService) {
        try {
            progressService.busyCursorWhile(monitor -> saveProjects(projectIds, firstFailure, monitor));
        } catch (InvocationTargetException e) {
            LOGGER.error("Saving workflow failed", e);
            firstFailure.compareAndExchange(null, Optional.empty());
        } catch (InterruptedException e) {
            LOGGER.warn("Saving process was interrupted", e);
            Thread.currentThread().interrupt();
            firstFailure.compareAndExchange(null, Optional.empty());
        }
    }

    private static void saveProjects(final String[] projectIds, final AtomicReference<Optional<String>> firstFailure,
        final IProgressMonitor monitor) {
        monitor.beginTask("Saving " + projectIds.length + " projects", projectIds.length);
        for (var projectId : projectIds) {
            var projectManager = ProjectManager.getInstance();
            var projectWfm =
                    projectManager.getProject(projectId).flatMap(Project::getWorkflowManagerIfLoaded).orElse(null);
            var success = saveAndCloseProject(monitor, projectId, projectWfm, projectManager);
            if (!success) {
                firstFailure.compareAndExchange(null, Optional.of(projectId));
            }
        }
    }

    private static boolean saveAndCloseProject(final IProgressMonitor monitor, final String projectId,
        final WorkflowManager projectWfm, final ProjectManager projectManager) {
        monitor.subTask("Saving '" + projectId + "'");

        // the actual saving should not contribute progress
        final var subMonitor = monitor.slice(0);

        // workflow not loaded -> nothing to save
        final var success = (projectWfm == null || SaveProject.saveProject(subMonitor, projectWfm, false));
        if (success) {
            projectManager.removeProject(projectId);
        }
        monitor.worked(1);
        return success;
    }

    /**
     * Encodes Java user dialog responses
     */
    public enum DialogResponse {
            /** Positive */
            YES,
            /** Negative */
            NO,
            /** Aborted */
            CANCEL_OR_CLOSE;

        static DialogResponse of(final int returnCode) {
            return switch (returnCode) {
                case 0 -> YES;
                case 1 -> NO;
                case -1, 2 -> CANCEL_OR_CLOSE;
                default -> throw new UnsupportedOperationException("Not implemented");
            };
        }

    }

    /**
     * Opens a user prompt asking to save all projects provided.
     *
     * @param dirtyWfms The dirty workflow managers to potentially save
     * @return The {@link DialogResponse}
     */
    public static DialogResponse promptWhetherToSaveProjects(final List<WorkflowManager> dirtyWfms) {
        String title;
        var message = new StringBuilder();
        if (dirtyWfms.isEmpty()) {
            return DialogResponse.NO;
        } else if (dirtyWfms.size() == 1) {
            title = "Save Workflow";
            message.append("Save '").append(dirtyWfms.get(0).getName()).append("'?");
        } else {
            title = "Save Workflows";
            message.append("Save workflows?\n");
            for (var dirtyWfm : dirtyWfms) {
                message.append("\n").append(dirtyWfm.getName());
            }
        }
        var buttons =
            new String[]{IDialogConstants.YES_LABEL, IDialogConstants.NO_LABEL, IDialogConstants.CANCEL_LABEL};
        var dialog = new MessageDialog( //
            SWTUtilities.getActiveShell(), //
            title, //
            null, //
            message.toString(), //
            MessageDialog.QUESTION, //
            buttons, //
            0 //
        );
        var dialogReturnCode = dialog.open();
        return DialogResponse.of(dialogReturnCode);
    }

    private static boolean promptCancelExecution(final List<WorkflowManager> wfms) {
        var namesOfExecutingProjects =
            wfms.stream().filter(Objects::nonNull).filter(wfm -> wfm.getNodeContainerState().isExecutionInProgress())
                .map(WorkflowManager::getName).toArray(String[]::new);
        if (namesOfExecutingProjects.length == 0) {
            return true;
        }
        String title;
        var message = new StringBuilder();
        if (namesOfExecutingProjects.length == 1) {
            title = "Workflow in execution";
            message.append("Executing nodes are not saved! Close anyway?");
        } else {
            title = "Workflows in execution";
            message.append("Workflows in execution:\n");
            for (var i = 0; i < namesOfExecutingProjects.length; i++) {
                message.append("\n").append(namesOfExecutingProjects[i]);
            }
            message.append("\nExecuting nodes are not saved! Close anyway?");
        }
        return MessageDialog.openQuestion(SWTUtilities.getActiveShell(), title, message.toString());
    }

    @SuppressWarnings("serial")
    static final class SaveAndCloseProjectsException extends IOException {

        private SaveAndCloseProjectsException(final String message) {
            super(message);
        }
    }

}
