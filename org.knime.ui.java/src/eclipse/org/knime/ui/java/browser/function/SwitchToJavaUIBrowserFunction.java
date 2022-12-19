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
 *   May 30, 2020 (hornm): created
 */
package org.knime.ui.java.browser.function;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.ui.IWorkbench;
import org.eclipse.ui.IWorkbenchWindow;
import org.eclipse.ui.PlatformUI;
import org.eclipse.ui.WorkbenchException;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.core.ui.util.SWTUtilities;
import org.knime.gateway.impl.project.WorkflowProject;
import org.knime.gateway.impl.project.WorkflowProjectManager;
import org.knime.ui.java.PerspectiveSwitchAddon;
import org.knime.ui.java.PerspectiveUtil;

import com.equo.chromium.swt.Browser;
import com.equo.chromium.swt.BrowserFunction;

/**
 * Browser function to allow the js webapp to switch back to the classic KNIME perspective.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public class SwitchToJavaUIBrowserFunction extends BrowserFunction {

	private static final String FUNCTION_NAME = "switchToJavaUI";

	@SuppressWarnings("javadoc")
    public SwitchToJavaUIBrowserFunction(final Browser browser) {
		super(browser, FUNCTION_NAME);
	}

    @Override
    public Object function(final Object[] args) { // NOSONAR
        if (!PerspectiveUtil.isClassicPerspectiveLoaded()) {
            // NOTE: if no classic UI has been loaded, yet,
            // all the open workflow projects will be closed on perspective switch, see PerspectiveSwitchAddon

            var openAndDirtyWorkflowProjects = getOpenAndDirtyWorkflowProjects();
            var message = "In order to switch to the classic UI all opened workflows are being closed.\n";
            if (isWorkflowExecutionInProgress(openAndDirtyWorkflowProjects)) {
                message += "However, there are workflows still executing. Can't switch to Classic UI.";
                MessageDialog.openWarning(SWTUtilities.getActiveShell(), "Can't switch to Classic UI", message);
                return null;
            }
            if (!openAndDirtyWorkflowProjects.isEmpty()) {
                // TODO NXT-1386
                message += "However, there are open workflows with unsaved changes:\n\n";
                message += openAndDirtyWorkflowProjects.stream().map(WorkflowProject::getName)
                    .collect(Collectors.joining("\n"));
                message += "\n\nCan't switch to Classic UI. Please save or close the workflows first.";
                MessageDialog.openWarning(SWTUtilities.getActiveShell(), "Can't switch to Classic UI", message);
                return null;
            }
        }

        IWorkbench workbench = PlatformUI.getWorkbench();
        IWorkbenchWindow window = workbench.getActiveWorkbenchWindow();
        try {
            var perspToRestore = PerspectiveSwitchAddon.getPreviousPerspectiveId() //
                .orElse(PerspectiveUtil.CLASSIC_PERSPECTIVE_ID);
            workbench.showPerspective(perspToRestore, window);
        } catch (WorkbenchException e) {
            // should never happen
            throw new RuntimeException(e); // NOSONAR
        }
        return null;
    }

    private static List<WorkflowProject> getOpenAndDirtyWorkflowProjects() {
        if (!PerspectiveUtil.isClassicPerspectiveLoaded()) {
            var wpm = WorkflowProjectManager.getInstance();
            return wpm.getWorkflowProjectsIds().stream() //
                .filter(id -> {
                    WorkflowManager wfm = wpm.getCachedWorkflow(id).orElse(null);
                    return wfm != null && wfm.isDirty();
                }) //
                .map(id -> wpm.getWorkflowProject(id).orElseThrow()) //
                .collect(Collectors.toList()); //
        }
        return Collections.emptyList();
    }

    private static boolean isWorkflowExecutionInProgress(final List<WorkflowProject> projects) {
        return projects.stream().map(WorkflowProject::openProject)
            .anyMatch(wfm -> wfm.getNodeContainerState().isExecutionInProgress());

    }

}
