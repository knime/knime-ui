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
package org.knime.ui.java.browser.function;

import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Optional;

import org.eclipse.e4.ui.model.application.ui.basic.MPart;
import org.eclipse.ui.PlatformUI;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.gateway.api.entity.NodeIDEnt;
import org.knime.gateway.impl.project.WorkflowProjectManager;
import org.knime.gateway.impl.service.util.DefaultServiceUtil;
import org.knime.gateway.impl.webui.AppStateProvider;
import org.knime.ui.java.EclipseUIStateUtil;
import org.knime.workbench.editor2.WorkflowEditor;

import com.equo.chromium.swt.Browser;
import com.equo.chromium.swt.BrowserFunction;

/**
 * @author Benjamin Moser, KNIME GmbH, Konstanz, Germany
 */
public class CloseWorkflowBrowserFunction extends BrowserFunction {

    private final AppStateProvider m_appStateProvider;

    @SuppressWarnings("javadoc")
    public CloseWorkflowBrowserFunction(final Browser browser, final AppStateProvider appStateProvider) {
        super(browser, "closeWorkflow");
        m_appStateProvider = appStateProvider;
    }

    /**
     * Close the Eclipse editor(s) associated with the given project ID.
     *
     * @param arguments An array of {@code String}s with contents:
     *            <ol>
     *            <li>The ID of the project to be closed</li>
     *            <li>The ID of the currently active project (can be the same as (1.))</li>
     *            <li>The ID of the project that was active before the currently active project. Can be {@code
     *                  null} or omitted if there is no previously active project (e.g. when closing the last remaining
     *            project).</li>
     *            </ol>
     * @return A boolean indicating whether an editor has been closed.
     */
    @Override
    public Object function(final Object[] arguments) {

        String projectIdToClose = Objects.requireNonNull((String)arguments[0], "Project ID to close not given");

        String currentlyActiveProjectId =
            Objects.requireNonNull((String)arguments[1], "Currently active project ID not given");

        Optional<String> previouslyActiveProjectId = requireAtIndex(arguments, 2, String.class);

        var editorToClose = getEditor(projectIdToClose);
        var page = PlatformUI.getWorkbench().getActiveWorkbenchWindow().getActivePage();
        // Since we are closing the editor of the root workflow manager, this will also close any editors
        //  of child workflow managers.
        var wasClosed = page.closeEditor(editorToClose, true);
        if (wasClosed) {
            WorkflowProjectManager.getInstance().removeWorkflowProject(projectIdToClose);

            // Workaround for keeping the classic and Web UI's editors/tabs in sync
            findNextActiveProjectId(projectIdToClose, currentlyActiveProjectId, previouslyActiveProjectId)
                .ifPresent(next -> {
                    EclipseUIStateUtil.setEditorPartActive(getEditorPart(next));
                });

            // triggers sending event
            m_appStateProvider.updateAppState();
        }

        return wasClosed;
    }

    /**
     * Determine the project ID whose editor should be made active after closing the current editor.
     */
    @SuppressWarnings("OptionalUsedAsFieldOrParameterType")
    private static Optional<String> findNextActiveProjectId(final String projectIdToClose,
        final String currentlyActiveProjectId, final Optional<String> previouslyActiveProjectId) {
        if (!projectIdToClose.equals(currentlyActiveProjectId)) {
            return Optional.of(currentlyActiveProjectId);
        } else {
            // If previouslyActiveProjectId is empty, we are closing the last editor tab. In this case, there is
            //   no next project to make active and this method should return an empty Optional as well.
            return previouslyActiveProjectId;
        }
    }

    private static WorkflowEditor getEditor(final String projectId) {
        return EclipseUIStateUtil.getOpenWorkflowEditor(getWorkflowManager(projectId))
            .orElseThrow(() -> new NoSuchElementException("No workflow editor for project found."));
    }

    private static MPart getEditorPart(final String projectId) {
        return EclipseUIStateUtil.getOpenWorkflowEditorPart(getWorkflowManager(projectId))
            .orElseThrow(() -> new NoSuchElementException("No workflow editor part for project found."));
    }

    private static WorkflowManager getWorkflowManager(final String projectId) {
        return DefaultServiceUtil.getWorkflowManager(projectId, NodeIDEnt.getRootID());
    }

    /**
     * @param arguments The source data
     * @param index The index of the element to look for
     * @param targetClass The class the element should be cast to
     * @param <V> The expected value type of the element.
     * @return An {code Optional} containing the element at the given {@code index} as cast to {@code targetClass} if it
     *         is present in the given * {@code arguments}, non-null and can be cast; or an empty {@code Optional}
     *         otherwise.
     */
    private static <V> Optional<V> requireAtIndex(final Object[] arguments, final int index,
        final Class<V> targetClass) {
        if (arguments.length - 1 < index) {
            return Optional.empty();
        }
        if (!targetClass.isAssignableFrom(arguments[index].getClass())) {
            return Optional.empty();
        }
        return Optional.ofNullable(arguments[index]).map(targetClass::cast);
    }

}
