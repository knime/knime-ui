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
 *   Jan 30, 2023 (hornm): created
 */
package org.knime.ui.java.api;

import java.io.IOException;
import java.util.Arrays;

import org.eclipse.ui.PlatformUI;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.workflow.NodeTimer;
import org.knime.core.node.workflow.NodeTimer.GlobalNodeStats.WorkflowType;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.gateway.impl.webui.AppStateUpdater;
import org.knime.gateway.impl.webui.spaces.SpaceProviders;
import org.knime.ui.java.browser.lifecycle.LifeCycle;
import org.knime.ui.java.browser.lifecycle.LifeCycle.StateTransition;

/**
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
final class WorkflowAPI {

    private WorkflowAPI() {
        // stateless
    }

    /**
     * Opens the workflow either in both, the Classic UI and the Modern/Web UI if the classic UI is active (the
     * WorkflowEditor is used in that case to open the workflow). Or it opens and loads the workflow exclusively in the
     * Modern UI. Those workflows won't be available in the classic UI when switching to it.
     *
     * @param spaceId
     * @param itemId
     * @param spaceProviderId {@code local} if absent
     */
    @API
    static void openWorkflow(final String spaceId, final String itemId, final String spaceProviderId) {
        OpenProject.openProject(spaceId, itemId, spaceProviderId);
    }

    /**
     * Close the Eclipse editor(s) associated with the given project ID.
     *
     * @param projectIdToClose The ID of the project to be closed
     * @param nextProjectId The ID of the project to make active after the current one has been closed. Can be null or
     *            omitted if there is no next project ID (e.g. when closing the last tab).
     * @return A boolean indicating whether an editor has been closed.
     */
    @API
    static boolean closeWorkflow(final String projectIdToClose, final String nextProjectId) {
        return CloseProject.closeProject(projectIdToClose, nextProjectId);
    }

    /**
     * Closes (i.e. removes from memory) all the workflows for the given projects ids without saving any pending
     * changes.
     *
     * @return whether all the workflows have been successfully been closed
     */
    @API
    static boolean forceCloseWorkflows(final Object[] projectIdsToClose) {
        return CloseProject.forceCloseProject(Arrays.stream(projectIdsToClose).map(String.class::cast).toList());
    }

    /**
     * Save the project workflow manager identified by a given project ID.
     */
    @API
    static void saveWorkflow(final String projectId, final String projectSVG) {
        SaveProject.saveProject(projectId, projectSVG, false);
    }

    /**
     * @param projectIdsAndSvgsAndMore array containing the project-ids and svgs of the projects to save. The very first
     *            entry contains the number of projects to save, e.g., n. Followed by n projects-ids (strings), followed
     *            by n svg-strings. And there is one last string at the very end describing the action to be carried out
     *            after the workflows have been saved ('PostWorkflowCloseAction').
     */
    @API
    static void saveAndCloseWorkflows(final Object[] projectIdsAndSvgsAndMore) {
        var progressService = PlatformUI.getWorkbench().getProgressService();
        SaveAndCloseProjects.saveAndCloseProjects(projectIdsAndSvgsAndMore, postWorkflowCloseAction -> { // NOSONAR
            switch (postWorkflowCloseAction) {
                case SWITCH_PERSPECTIVE -> EclipseUIAPI.doSwitchToJavaUI();
                case SHUTDOWN -> { // NOSONAR
                    var lifeCycle = LifeCycle.get();
                    if (lifeCycle.isLastStateTransition(StateTransition.WEB_APP_LOADED)) {
                        // we skip the save-state state-transition because once we arrive here save-state has definitely
                        // been called; otherwise we wouldn't get here
                        lifeCycle.setStateTransition(StateTransition.SAVE_STATE);
                    }
                    lifeCycle.suspend();
                    PlatformUI.getWorkbench().close();
                }
                default -> DesktopAPI.getDeps(AppStateUpdater.class).updateAppState();
            }
        }, progressService);
    }

    /**
     * Sets that project for the given id to active and ensures that the workflow is already loaded (in memory). And
     * loads it if not.
     *
     * @param projectId
     */
    @API
    static void setProjectActiveAndEnsureItsLoaded(final String projectId) {
        var wpm = ProjectManager.getInstance();
        var wfm = wpm.getCachedProject(projectId).orElse(null);
        if (wfm == null) {
            // workflow hasn't been loaded, yet -> open it
            wfm = wpm.openAndCacheProject(projectId).orElse(null);
            if (wfm != null) {
                NodeTimer.GLOBAL_TIMER.incWorkflowOpening(wfm, WorkflowType.LOCAL);
            }
        }
        if (wfm != null) {
            wpm.setProjectActive(projectId);
        } else {
            wpm.removeProject(projectId, w -> {});
            NodeLogger.getLogger(WorkflowAPI.class)
                .error("Workflow with ID '" + projectId + "' couldn't be loaded. Workflow closed.");
            DesktopAPI.getDeps(AppStateUpdater.class).updateAppState();
        }
    }

    /**
     * @see SaveProjectCopy#saveCopyOf(String, String)
     *
     * @param projectId The project ID of the open remote workflow
     * @throws IOException if moving the workflow fails
     */
    @API
    static void saveWorkflowAs(final String projectId, final String workflowSvg) {
        SaveProjectCopy.saveCopyOf(projectId, workflowSvg);
    }

    /**
     * Executes or schedules a job on a Server.
     *
     * @param spaceProviderId
     * @param spaceId
     * @param itemId
     * @throws IOException
     */
    @API
    static void executeOnClassic(final String spaceProviderId, final String spaceId, final String itemId)
        throws IOException {
        final var space = SpaceProviders.getSpace(DesktopAPI.getDeps(SpaceProviders.class), spaceProviderId, spaceId);
        space.openRemoteExecution(itemId);
    }

}
