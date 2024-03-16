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
 *   Jan 16, 2023 (hornm): created
 */
package org.knime.ui.java.browser.lifecycle;

import org.eclipse.core.runtime.jobs.Job;
import org.eclipse.ui.PlatformUI;
import org.knime.core.node.NodeLogger;
import org.knime.gateway.api.util.CoreUtil;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.gateway.impl.project.WorkflowServiceProjects;
import org.knime.gateway.impl.webui.service.ServiceInstances;
import org.knime.ui.java.api.CloseProject;
import org.knime.ui.java.api.DesktopAPI;
import org.knime.ui.java.prefs.KnimeUIPreferences;
import org.knime.ui.java.util.PerspectiveUtil;

/**
 * The 'suspend' lifecycle state transition for the KNIME-UI. Called when the view is (temporarily) not used anymore (on
 * perspective switch to the classic UI).
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
final class Suspend {

    private Suspend() {
        //
    }

    static LifeCycleStateInternal run(final LifeCycleStateInternal state) {
        DesktopAPI.disposeDependencies();
        ServiceInstances.disposeAllServiceInstancesAndDependencies();
        disposeAllProjects(!PerspectiveUtil.isClassicPerspectiveLoaded());
        KnimeUIPreferences.unsetAllListeners();
        var listener = state.getJobChangeListener();
        Job.getJobManager().removeJobChangeListener(listener);
        if (PerspectiveUtil.isClassicPerspectiveLoaded()) {
            final var page = PlatformUI.getWorkbench().getActiveWorkbenchWindow().getActivePage();
            page.removePartListener(CloseProject.LISTENER);
        }
        return new LifeCycleStateInternalAdapter(state) {

            @Override
            public String serializedAppState() {
                return state.serializedAppState();
            }
        };
    }

    private static void disposeAllProjects(final boolean disposeWorkflowManagers) {
        var pm = ProjectManager.getInstance();
        // dispose all projects that are used by the UI
        pm.getProjectIds().stream().forEach(projectId -> {
            if (disposeWorkflowManagers) {
                pm.getCachedProject(projectId).ifPresent(t -> {
                    try {
                        CoreUtil.cancelAndCloseLoadedWorkflow(t);
                    } catch (InterruptedException e) { // NOSONAR
                        NodeLogger.getLogger(Suspend.class).error(e);
                    }
                });
            }
            pm.removeProject(projectId, w -> {
            });
        });

        // (triggers to) dispose all projects used as workflow service
        if (disposeWorkflowManagers) {
            WorkflowServiceProjects.removeAllProjects();
        }
    }

}
