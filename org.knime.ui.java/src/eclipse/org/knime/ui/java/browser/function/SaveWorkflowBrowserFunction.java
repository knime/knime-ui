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
 *   Jan 5, 2022 (hornm): created
 */
package org.knime.ui.java.browser.function;

import java.util.Arrays;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

import org.eclipse.core.runtime.NullProgressMonitor;
import org.eclipse.ui.PlatformUI;
import org.knime.core.node.workflow.SubNodeContainer;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.gateway.api.entity.NodeIDEnt;
import org.knime.gateway.impl.service.util.DefaultServiceUtil;
import org.knime.ui.java.appstate.AppStateUtil;
import org.knime.workbench.editor2.WorkflowEditor;

import com.equo.chromium.swt.Browser;
import com.equo.chromium.swt.BrowserFunction;

/**
 * Save the project workflow manager identified by a given project ID.
 *
 * @author Benjamin Moser, KNIME GmbH, Konstanz
 */
public class SaveWorkflowBrowserFunction extends BrowserFunction {


    /**
     * @param browser
     * @param name
     */
    public SaveWorkflowBrowserFunction(final Browser browser) {
        super(browser, "saveWorkflow");
    }

    /**
     * Save the project workflow manager identified by a given project ID.
     * @param arguments Assume arguments[0] is a String containing the project ID (e.g. "simple-workflow 0").
     * @return always {@code null}
     */
    @Override
    public Object function(final Object[] arguments) {

        String projectId = (String)arguments[0];  // e.g. "simple-workflow 0"

        var projectWfm = DefaultServiceUtil.getWorkflowManager(projectId, NodeIDEnt.getRootID());
        // For at least as long as new frontend is integrated in "old" knime eclipse workbench,
        // we want a save action triggered from new frontend to be consistent with one triggered
        // from the traditional UI. The best thing we can do is trigger the exact same action.
        WorkflowEditor editor = getEditorForManager(projectWfm).orElseThrow(
                () -> new NoSuchElementException("No workflow editor for project found.")
        );
        editor.doSave(new NullProgressMonitor());

        // Workaround to set sub-editors to clean (cf WorkflowEditor#saveTo)
        // If viewing in new frontend, the existing implementation does not suffice to find sub-editors.
        var display = PlatformUI.getWorkbench().getDisplay();
        display.asyncExec(() -> {
            if (display.isDisposed()) {
                return;
            }
            getChildWfms(projectWfm).stream()
                    .map(SaveWorkflowBrowserFunction::getEditorForManager)
                    .flatMap(Optional::stream)  // unpack/collapse optionals
                    .forEach(WorkflowEditor::unmarkDirty);
        });

        return null;
    }

    /**
     * Obtain the {@link WorkflowEditor} for a given {@link WorkflowManager} by looking through
     * the currently open editors.
     * @param targetWfm The workflow manager to retrieve the editor for
     * @return An optional containing the workflow editor for the given target workflow manager, or an empty optional
     *  if no such editor could be unambiguously determined
     */
    private static Optional<WorkflowEditor> getEditorForManager(final WorkflowManager targetWfm) {
        var matchedEditors = AppStateUtil.getOpenWorkflowEditors().stream()
                .filter(wfEd -> wfEd.getWorkflowManager()
                        .map(e -> Objects.equals(e, targetWfm))
                        .orElse(false)
                )
                .collect(Collectors.toList());
        if (matchedEditors.size() == 1) {
            return Optional.of(matchedEditors.get(0));
        } else {
            return Optional.empty();
        }
    }

    /**
     * Get the {@link WorkflowManager}s of node containers contained in the given workflow manager (no recursion).
     * @param parent The workflow manager whose direct children (contained node containers) to consider
     * @return A list of workflow managers that correspond to node containers appearing in the parent workflow manager.
     */
    private static List<WorkflowManager> getChildWfms(final WorkflowManager parent) {
        return parent.getNodeContainers().stream().map(nodeContainer -> {
            if (nodeContainer instanceof SubNodeContainer) {
                return ((SubNodeContainer)nodeContainer).getWorkflowManager();
            } else if (nodeContainer instanceof WorkflowManager) {
                return (WorkflowManager)nodeContainer;
            } else {  // native nodes etc.
                return null;
            }
        }).filter(Objects::nonNull).collect(Collectors.toList());
    }

}
