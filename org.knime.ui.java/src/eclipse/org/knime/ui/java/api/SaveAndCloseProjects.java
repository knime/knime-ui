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

import static org.knime.ui.java.api.DesktopAPI.MAPPER;

import java.lang.reflect.InvocationTargetException;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;

import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.jface.dialogs.IDialogConstants;
import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.jface.operation.IRunnableWithProgress;
import org.eclipse.ui.progress.IProgressService;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.core.ui.util.SWTUtilities;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.gateway.impl.webui.AppStateUpdater;
import org.knime.gateway.impl.webui.service.events.EventConsumer;
import org.knime.ui.java.util.DesktopAPUtil;

/**
 * Called to 'headlessly' (i.e. without any user-interaction) save and close all the projects specified as parameter.
 * Additionally, a specified {@link PostProjectCloseAction} is executed.
 *
 * The call of this browser function is usually indirectly triggered by an event sent from the Backend (see
 * {@link #saveAndCloseProjectsInteractively(Set, EventConsumer, PostProjectCloseAction)}). The event being sent to
 * the Frontend instructs it to generate all the project-svg images of the passed projects (projectIds). Once done,
 * the Frontend calls this browser function with all the generated svg-images, project-ids and the forwarded
 * {@link PostProjectCloseAction}.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public final class SaveAndCloseProjects {

    private SaveAndCloseProjects() {
        // utility
    }

    /**
     * The action to be carried out after the projects have been successfully saved and closed.
     */
    @SuppressWarnings("javadoc")
    public enum PostProjectCloseAction {
            SWITCH_PERSPECTIVE, SHUTDOWN, UPDATE_APP_STATE
    }

    /**
     * Saves and closes the projects represented by the given project-ids. Project-ids that don't reference an opened
     * workflow will just be ignored.
     *
     * @param projectIdsAndSvgsAndMore array containing the project-ids and svgs of the projects to save. The very first
     *            entry contains the number of projects to save, e.g., n. Followed by n projects-ids (strings), followed
     *            by n svg-strings. And there is one last string at the very end describing the action to be carried out
     *            after the projects have been saved ('PostProjectCloseAction').
     * @param runPostProjectCloseAction callback to the the provided post-project-close-action
     * @param progressService displays the progress
     */
    static void saveAndCloseProjects(final Object[] projectIdsAndSvgsAndMore,
        final Consumer<PostProjectCloseAction> runPostProjectCloseAction, final IProgressService progressService) { // NOSONAR
        var count = ((Double)projectIdsAndSvgsAndMore[0]).intValue();
        var firstFailure = new AtomicReference<Optional<String>>();
        var projectIds = Arrays.copyOfRange(projectIdsAndSvgsAndMore, 1, count + 1, String[].class);
        var svgs = Arrays.copyOfRange(projectIdsAndSvgsAndMore, count + 1, count * 2 + 1, String[].class);
        saveProjectsWithProgressBar(projectIds, svgs, firstFailure, progressService);

        final var optFailure = firstFailure.get();
        if (optFailure != null) { // NOSONAR
            DesktopAPUtil.showWarning("Failed to save workflow", "Workflow could not be saved.\nSee log for details.");
            // make the first project active which couldn't be saved
            optFailure.ifPresent(projectId -> ProjectManager.getInstance().setProjectActive(projectId));
            DesktopAPI.getDeps(AppStateUpdater.class).updateAppState();
            return;
        }

        var postProjectCloseAction = PostProjectCloseAction.valueOf((String)projectIdsAndSvgsAndMore[count * 2 + 1]);
        if (postProjectCloseAction == PostProjectCloseAction.UPDATE_APP_STATE) {
            DesktopAPI.getDeps(AppStateUpdater.class).updateAppState();
        } else {
            runPostProjectCloseAction.accept(postProjectCloseAction);
        }
    }

    /**
     * Closes the given projects (project-ids) and asks the user to save the projects with unsaved changes. Also asks
     * the user to cancel executing projects.
     *
     * @param projectIds
     * @param eventConsumer
     * @param action
     * @return {@code 0} if the closing process has been cancelled or failed; {@code 1} if the projects have been
     *         closed successfully; {@code 2} if the projects require to be saved (in which case, an event is triggered
     *         to save and close the projects)
     */
    public static int saveAndCloseProjectsInteractively(final List<String> projectIds,
        final EventConsumer eventConsumer, final PostProjectCloseAction action) {
        var pm = ProjectManager.getInstance();
        var dirtyProjectIds = projectIds.stream()
            .filter(id -> pm.getCachedProject(id).map(WorkflowManager::isDirty).orElse(false)).toArray(String[]::new);
        var dirtyWfms = Arrays.stream(dirtyProjectIds).flatMap(id -> pm.getCachedProject(id).stream())
            .toArray(WorkflowManager[]::new);
        var shallSaveProjects = promptWhetherToSaveProjects(dirtyWfms);
        switch (shallSaveProjects) {
            case 0: // YES
                if (shallCancelProjectsIfNecessary(dirtyWfms)) {
                    sendSaveAndCloseProjectsEventToFrontend(dirtyProjectIds, eventConsumer, action);
                }
                return 2;
            case 1: // NO
                return CloseProject.closeProjects(projectIds) ? 1 : 0;
            default: // CANCEL button or window 'x'
                return 0;
        }
    }

    private static void saveProjectsWithProgressBar(final String[] projectIds, final String[] svgs,
        final AtomicReference<Optional<String>> firstFailure, final IProgressService progressService) {
        IRunnableWithProgress saveRunnable = monitor -> saveProjects(projectIds, svgs, firstFailure, monitor);
        try {
            progressService.run(true, false, saveRunnable);
        } catch (InvocationTargetException e) {
            NodeLogger.getLogger(SaveAndCloseProjects.class).error("Saving workflow failed", e);
            firstFailure.compareAndExchange(null, Optional.empty());
        } catch (InterruptedException e) {
            NodeLogger.getLogger(SaveAndCloseProjects.class).warn("Saving process was interrupted", e);
            Thread.currentThread().interrupt();
            firstFailure.compareAndExchange(null, Optional.empty());
        }
    }

    private static void saveProjects(final String[] projectIds, final String[] svgs,
        final AtomicReference<Optional<String>> firstFailure, final IProgressMonitor monitor) {
        monitor.beginTask("Saving " + projectIds.length + " projects", projectIds.length);
        for (var i = 0; i < projectIds.length; i++) {
            var projectId = projectIds[i];
            var projectSVG = svgs[i];
            var projectWfm = ProjectManager.getInstance().getCachedProject(projectId).orElse(null);
            var success = saveAndCloseProject(monitor, projectId, projectSVG, projectWfm);
            if (!success) {
                firstFailure.compareAndExchange(null, Optional.of(projectId));
            }
        }
    }

    private static boolean saveAndCloseProject(final IProgressMonitor monitor, final String projectId,
        final String projectSVG, final WorkflowManager projectWfm) {
        monitor.subTask("Saving '" + projectId + "'");
        // workflow not loaded -> nothing to save
        final var success = (projectWfm == null || SaveProject.saveProject(monitor, projectWfm, projectSVG, false))
                && CloseProject.closeProject(projectId);
        monitor.worked(1);
        return success;
    }

    private static void sendSaveAndCloseProjectsEventToFrontend(final String[] dirtyProjectIds,
        final EventConsumer eventConsumer, final PostProjectCloseAction action) {
        var projectIdsJson = MAPPER.createArrayNode();
        Arrays.stream(dirtyProjectIds).forEach(projectIdsJson::add);
        var paramsJson = MAPPER.createArrayNode();
        paramsJson.add(action.name());
        var event = MAPPER.createObjectNode();
        event.set("projectIds", projectIdsJson);
        event.set("params", paramsJson);
        eventConsumer.accept("SaveAndCloseProjectsEvent", event);
    }

    /**
     * Opens a user prompt asking to save all projects provided.
     *
     * @param dirtyWfms The dirty workflow managers to potentially save
     * @return {@code 0} if 'Yes', {@code 1} if 'No', {@code 2} if 'Cancel'
     */
    public static int promptWhetherToSaveProjects(final WorkflowManager... dirtyWfms) {
        String title;
        var message = new StringBuilder();
        if (dirtyWfms.length == 0) {
            return 1;
        } else if (dirtyWfms.length == 1) {
            title = "Save Workflow";
            message.append("Save '" + dirtyWfms[0].getName() + "'?");
        } else {
            title = "Save Workflows";
            message.append("Save workflows?\n");
            for (var i = 0; i < dirtyWfms.length; i++) {
                message.append("\n" + dirtyWfms[i].getName());
            }
        }
        var sh = SWTUtilities.getActiveShell();
        var buttons =
            new String[]{IDialogConstants.YES_LABEL, IDialogConstants.NO_LABEL, IDialogConstants.CANCEL_LABEL};
        var d = new MessageDialog(sh, title, null, message.toString(), MessageDialog.QUESTION, buttons, 0);
        return d.open();
    }

    private static boolean shallCancelProjectsIfNecessary(final WorkflowManager... wfms) {
        var namesOfExecutingProjects = Arrays.stream(wfms).filter(Objects::nonNull)
            .filter(wfm -> wfm.getNodeContainerState().isExecutionInProgress()).map(WorkflowManager::getName)
            .toArray(String[]::new);
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
                message.append("\n" + namesOfExecutingProjects[i]);
            }
            message.append("\nExecuting nodes are not saved! Close anyway?");
        }
        return MessageDialog.openQuestion(SWTUtilities.getActiveShell(), title, message.toString());
    }

}
