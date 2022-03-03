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

import org.eclipse.jface.viewers.StructuredSelection;
import org.eclipse.jface.window.Window;
import org.eclipse.jface.wizard.WizardDialog;
import org.eclipse.ui.PlatformUI;
import org.knime.core.ui.util.SWTUtilities;
import org.knime.gateway.impl.webui.AppStateProvider;
import org.knime.workbench.explorer.ExplorerMountTable;
import org.knime.workbench.explorer.localworkspace.LocalWorkspaceContentProvider;
import org.knime.workbench.explorer.localworkspace.LocalWorkspaceContentProviderFactory;
import org.knime.workbench.explorer.view.actions.NewWorkflowWizard;

import com.equo.chromium.swt.Browser;
import com.equo.chromium.swt.BrowserFunction;

/**
 * Display a wizard for creating a new workflow. Has the LOCAL mountpoint set as default parent. The wizard will create
 * the workflow files and open an editor for the newly created workflow in the Java UI.
 *
 * @author Benjamin Moser, KNIME GmbH, Konstanz, Germany
 * @see org.knime.workbench.explorer.view.actions.NewWorkflowWizard
 */
public class CreateWorkflowBrowserFunction extends BrowserFunction {

    private final AppStateProvider m_appStateProvider;

    private static final int WIZARD_DIALOG_WIDTH = 470;

    private static final int WIZARD_DIALOG_HEIGHT = 550;

    @SuppressWarnings("javadoc")
    public CreateWorkflowBrowserFunction(final Browser browser, final AppStateProvider appStateProvider) {
        super(browser, "createWorkflow");
        m_appStateProvider = appStateProvider;
    }

    /**
     * Display the "New KNIME Workflow" wizard
     *
     * @param arguments No parameters expected, parameter is ignored.
     * @return Always {@code null}.
     */
    @Override
    public Object function(final Object[] arguments) {
        var newWorkflowWizard = new NewWorkflowWizard();
        String defaultLocalMountpointID = new LocalWorkspaceContentProviderFactory().getDefaultMountID();
        var localRootStore = ExplorerMountTable.getMountPoint(defaultLocalMountpointID).getProvider().getRootStore();
        newWorkflowWizard.init(PlatformUI.getWorkbench(),
                new StructuredSelection(localRootStore),
                LocalWorkspaceContentProvider.class::isInstance
        );
        var wizardDialog = new WizardDialog(SWTUtilities.getActiveShell(), newWorkflowWizard);
        wizardDialog.setHelpAvailable(false);
        wizardDialog.create();
        wizardDialog.getShell().setSize(Math.max(WIZARD_DIALOG_WIDTH, wizardDialog.getShell().getSize().x),
            WIZARD_DIALOG_HEIGHT);
        var response = wizardDialog.open();
        if (response == Window.OK) {
            m_appStateProvider.updateAppState();
        }
        // Do nothing if wizard is aborted.
        return null;
    }
}
