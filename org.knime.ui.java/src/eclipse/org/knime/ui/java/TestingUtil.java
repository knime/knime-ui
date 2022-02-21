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
package org.knime.ui.java;

import java.io.File;
import java.io.IOException;
import java.util.HashSet;
import java.util.Set;
import java.util.function.Supplier;

import org.eclipse.core.resources.ResourcesPlugin;
import org.knime.core.node.CanceledExecutionException;
import org.knime.core.node.InvalidSettingsException;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.workflow.UnsupportedWorkflowVersionException;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.core.util.LockFailedException;
import org.knime.gateway.impl.project.WorkflowProject;
import org.knime.gateway.impl.project.WorkflowProjectManager;
import org.knime.gateway.impl.webui.AppStateProvider;
import org.knime.gateway.impl.webui.service.ServiceDependencies;
import org.knime.ui.java.appstate.AppStateUtil;

/**
 * Utility methods for testing.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 * @author Benjamin Moser, KNIME GmbH, Konstanz, Germany
 */
public class TestingUtil {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(TestingUtil.class);

    public static Set<String> loadedWorkflowsForTesting;

    /**
     * @see AppStateUtil#initAppStateProvider(Supplier)
     */
    public static void initAppStateForTesting(final AppStateProvider.AppState appState) {
        appState.getOpenedWorkflows().forEach(TestingUtil::addToProjectManagerForTesting);
        AppStateUtil.clearAppState();
        var appStateProvider = new AppStateProvider(() -> appState);
        ServiceDependencies.add(AppStateProvider.class, appStateProvider);
    }

    private static void addToProjectManagerForTesting(final AppStateProvider.AppState.OpenedWorkflow workflow) {
        WorkflowProjectManager.addWorkflowProject(workflow.getProjectId(), new WorkflowProject() {

            @Override
            public WorkflowManager openProject() {
                return loadWorkflowForTesting(workflow);
            }

            @Override
            public String getName() {
                return workflow.getProjectId();
            }

            @Override
            public String getID() {
                return workflow.getProjectId();
            }
        });
    }

    private static WorkflowManager loadWorkflowForTesting(final AppStateProvider.AppState.OpenedWorkflow workflow) {
        var file = new File(ResourcesPlugin.getWorkspace().getRoot().getLocation().toFile(), workflow.getProjectId());
        try {
            WorkflowManager wfm = EclipseUIStateUtil.loadWorkflow(file);
            if (loadedWorkflowsForTesting == null) {
                loadedWorkflowsForTesting = new HashSet<>();
            }
            loadedWorkflowsForTesting.add(workflow.getProjectId());
            return wfm;
        } catch (IOException | InvalidSettingsException | CanceledExecutionException
                | UnsupportedWorkflowVersionException | LockFailedException ex) {
            LOGGER.error("Workflow at '" + file + "' couldn't be loaded", ex);
            return null;
        }
    }
}
