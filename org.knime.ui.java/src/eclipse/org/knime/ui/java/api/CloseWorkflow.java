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

import java.util.Collections;
import java.util.NoSuchElementException;

import org.eclipse.e4.ui.model.application.ui.basic.MPart;
import org.eclipse.ui.PlatformUI;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.gateway.api.entity.NodeIDEnt;
import org.knime.gateway.impl.project.WorkflowProjectManager;
import org.knime.gateway.impl.service.util.DefaultServiceUtil;
import org.knime.gateway.impl.service.util.EventConsumer;
import org.knime.gateway.impl.webui.AppStateUpdater;
import org.knime.ui.java.api.SaveAndCloseWorkflows.PostWorkflowCloseAction;
import org.knime.ui.java.util.ClassicWorkflowEditorUtil;
import org.knime.ui.java.util.PerspectiveUtil;
import org.knime.workbench.editor2.WorkflowEditor;

/**
 * @author Benjamin Moser, KNIME GmbH, Konstanz, Germany
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
final class CloseWorkflow {

    private CloseWorkflow() {
        // utility
    }

    /**
     * Close the Eclipse editor(s) associated with the given project ID.
     *
     * @param arguments An array of {@code String}s with contents:
     *            <ol>
     *            <li>The ID of the project to be closed</li>
     *            <li>The ID of the project to make active after the current one has been closed. Can be null or omitted
     *            if there is no next project ID (e.g. when closing the last tab).</li>
     *            </ol>
     * @return A boolean indicating whether an editor has been closed.
     */
    static boolean closeWorkflow(final String projectIdToClose, final String nextProjectId) {
        if (PerspectiveUtil.isClassicPerspectiveLoaded()) {
            return closeWorkflowViaClassicUI(projectIdToClose, nextProjectId);
        } else {
            if (nextProjectId != null) {
                var wpm = WorkflowProjectManager.getInstance();
                wpm.openAndCacheWorkflow(nextProjectId);
                wpm.setWorkflowProjectActive(nextProjectId);
            }
            var success = SaveAndCloseWorkflows.saveAndCloseWorkflowsInteractively(Collections.singleton(projectIdToClose),
                DesktopAPI.getDeps(EventConsumer.class), PostWorkflowCloseAction.UPDATE_APP_STATE) == 1;
            if (success) {
                DesktopAPI.getDeps(AppStateUpdater.class).updateAppState();
            }
            return success;
        }
    }

    private static boolean closeWorkflowViaClassicUI(final String projectIdToClose, final String nextProjectId) {
        var editorToClose = getEditor(projectIdToClose);
        var page = PlatformUI.getWorkbench().getActiveWorkbenchWindow().getActivePage();
        // Since we are closing the editor of the root workflow manager, this will also close any editors
        //  of child workflow managers.
        var wasClosed = page.closeEditor(editorToClose, true);
        if (wasClosed) {
            var wpm = WorkflowProjectManager.getInstance();
            wpm.removeWorkflowProject(projectIdToClose);

            // Workaround for keeping the classic and Web UI's editors/tabs in sync
            if (nextProjectId != null) {
                wpm.openAndCacheWorkflow(nextProjectId);
                wpm.setWorkflowProjectActive(nextProjectId);
                ClassicWorkflowEditorUtil.setEditorPartActive(getEditorPart(nextProjectId));
            }

            // triggers sending event
            DesktopAPI.getDeps(AppStateUpdater.class).updateAppState();
        }

        return wasClosed;
    }

    private static WorkflowEditor getEditor(final String projectId) {
        return ClassicWorkflowEditorUtil.getOpenWorkflowEditor(getWorkflowManager(projectId))
            .orElseThrow(() -> new NoSuchElementException("No workflow editor for project found."));
    }

    private static MPart getEditorPart(final String projectId) {
        return ClassicWorkflowEditorUtil.getOpenWorkflowEditorPart(getWorkflowManager(projectId))
            .orElseThrow(() -> new NoSuchElementException("No workflow editor part for project found."));
    }

    private static WorkflowManager getWorkflowManager(final String projectId) {
        return DefaultServiceUtil.getWorkflowManager(projectId, NodeIDEnt.getRootID());
    }

}
