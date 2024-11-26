/*
 * ------------------------------------------------------------------------
 *
 *  Copyright by KNIME AG, Zurich, Switzerland
 *  Website: http://www.knime.org; Email: contact@knime.org
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
 */
package org.knime.ui.java.api;

import static org.knime.ui.java.api.SaveAndCloseProjects.saveAndCloseProjectsInteractively;

import java.util.Collection;
import java.util.Collections;
import java.util.concurrent.atomic.AtomicBoolean;

import org.knime.core.node.NodeLogger;
import org.knime.gateway.api.util.CoreUtil;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.gateway.impl.webui.AppStateUpdater;
import org.knime.gateway.impl.webui.service.events.EventConsumer;
import org.knime.ui.java.api.SaveAndCloseProjects.PostProjectCloseAction;

/**
 * Closes a project.
 *
 * @author Benjamin Moser, KNIME GmbH, Konstanz, Germany
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public final class CloseProject {

    private CloseProject() {
        // utility
    }

    /**
     * Close the Eclipse editor(s) associated with the given project ID.
     *
     * @param projectIdToClose The ID of the project to be closed
     * @param nextProjectId The ID of the project to make active after the current one has been closed. Can be null or
     *            omitted if there is no next project ID (e.g. when closing the last tab).
     * @return A boolean indicating whether an editor has been closed.
     */
    static boolean closeProject(final String projectIdToClose, final String nextProjectId) {
        var projectManager = DesktopAPI.getDeps(ProjectManager.class);
        projectManager.setProjectActive(nextProjectId);
        if (nextProjectId != null) {
            projectManager.openAndCacheProject(nextProjectId);
        }
        var saveAndCloseState = saveAndCloseProjectsInteractively(Collections.singletonList(projectIdToClose),
            DesktopAPI.getDeps(EventConsumer.class), PostProjectCloseAction.UPDATE_APP_STATE);
        var success = saveAndCloseState == SaveAndCloseProjects.State.SUCCESS;
        if (success) {
            DesktopAPI.getDeps(AppStateUpdater.class).updateAppState();
        }
        return success;
    }

    /**
     * @param projectIdsToClose
     */
    static boolean forceCloseProjects(final Collection<String> projectIdsToClose) {
        var success = closeProjects(projectIdsToClose);
        DesktopAPI.getDeps(AppStateUpdater.class).updateAppState();
        return success;
    }

    /**
     * Closes all projects for the given ids, no matter whether they are dirty or not. If there is no project for a
     * given id, it will be ignored.
     *
     * @param projectIds the ids of the projects to close
     * @return {@code false} if at least one project wasn't closed successfully otherwise {@code true}
     */
    public static boolean closeProjects(final Collection<String> projectIds) {
        var success = true;
        for (var projectId : projectIds) {
            success &= closeProject(projectId);
        }
        return success;
    }

    static boolean closeProject(final String projectId) {
        var projectManager = ProjectManager.getInstance();
        var success = new AtomicBoolean(true);
        projectManager.removeProject(projectId, wfm -> {
            try {
                CoreUtil.cancelAndCloseLoadedWorkflow(wfm);
            } catch (InterruptedException e) { // NOSONAR
                NodeLogger.getLogger(SaveAndCloseProjects.class)
                    .warn("Problem while waiting for the workflow '" + projectId + "' to be cancelled", e);
                success.set(false);
            }
        });
        return success.get();
    }

}
