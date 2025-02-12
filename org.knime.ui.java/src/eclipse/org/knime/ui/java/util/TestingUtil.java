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
package org.knime.ui.java.util;

import java.io.File;
import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Supplier;

import org.eclipse.core.resources.ResourcesPlugin;
import org.knime.core.node.CanceledExecutionException;
import org.knime.core.node.InvalidSettingsException;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.workflow.UnsupportedWorkflowVersionException;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.core.util.LockFailedException;
import org.knime.gateway.impl.project.CachedProject;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.gateway.impl.webui.spaces.local.LocalSpace;
import org.knime.ui.java.browser.KnimeBrowserView;
import org.knime.ui.java.browser.lifecycle.LifeCycle;
import org.knime.ui.java.browser.lifecycle.LifeCycle.StateTransition;

/**
 * Utility methods for testing.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 * @author Benjamin Moser, KNIME GmbH, Konstanz, Germany
 */
public final class TestingUtil {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(TestingUtil.class);

    private static Set<String> loadedWorkflowsForTesting;

    /**
     * Initializes the app for testing and 'opens' the passed projects.
     *
     * @param projectIds projects to be available as tabs
     * @param activeProjectId the active tab
     * @param localSpaceSupplier the lazily supplied local space (might not be available at the time this method is
     *            called)
     */
    public static void initAppForTesting(final List<String> projectIds, final String activeProjectId,
        final Supplier<LocalSpace> localSpaceSupplier) {
        clearAppForTesting();
        TestingUtil.addToProjectManagerForTesting(projectIds, activeProjectId, localSpaceSupplier);
        KnimeBrowserView.initViewForTesting();
    }

    /**
     * Clears the entire app state.
     */
    public static void clearAppForTesting() {
        var lifeCycle = LifeCycle.get();
        if (lifeCycle.isNextStateTransition(StateTransition.SAVE_STATE)) {
            KnimeBrowserView.clearView();
            lifeCycle.setStateTransition(StateTransition.SAVE_STATE);
            lifeCycle.suspend();
        }
        disposeLoadedWorkflowsForTesting();
    }

    private static void addToProjectManagerForTesting(final List<String> projectIds, final String activeProjectId,
        final Supplier<LocalSpace> localSpaceSupplier) {
        var wpm = ProjectManager.getInstance();
        projectIds.forEach(projectId -> wpm.addProject( //
            CachedProject.builder() //
                .setWfmLoader(() -> loadWorkflowForTesting(projectId)) //
                .setName(projectId) //
                .setId(projectId) //
                .setOrigin(LocalSpaceUtil.getLocalOrigin(getProjectFile(projectId).toPath(), localSpaceSupplier.get())) //
                .build()));
        if (activeProjectId != null) {
            wpm.setProjectActive(activeProjectId);
        }

    }

    private static WorkflowManager loadWorkflowForTesting(final String projectId) {
        var file = getProjectFile(projectId);
        try {
            WorkflowManager wfm = ClassicWorkflowEditorUtil.loadTempWorkflow(file);
            if (loadedWorkflowsForTesting == null) {
                loadedWorkflowsForTesting = new HashSet<>();
            }
            loadedWorkflowsForTesting.add(projectId);
            return wfm;
        } catch (IOException | InvalidSettingsException | CanceledExecutionException
                | UnsupportedWorkflowVersionException | LockFailedException ex) {
            LOGGER.error("Workflow at '" + file + "' couldn't be loaded", ex);
            return null;
        }
    }

    private static void disposeLoadedWorkflowsForTesting() {
        if (loadedWorkflowsForTesting != null) {
            for (String id : loadedWorkflowsForTesting) {
                var wpm = ProjectManager.getInstance();
                wpm.removeProject(id);
            }
            loadedWorkflowsForTesting.clear();
        }

    }

    private static File getProjectFile(final String projectId) {
        return new File(ResourcesPlugin.getWorkspace().getRoot().getLocation().toFile(), projectId);
    }

    private TestingUtil() {
        // utility
    }
}
