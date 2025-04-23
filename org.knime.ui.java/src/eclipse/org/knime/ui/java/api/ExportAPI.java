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
 *   13 Jul 2023 (baqueroj): created
 */
package org.knime.ui.java.api;

import org.eclipse.jface.viewers.StructuredSelection;
import org.eclipse.jface.window.Window;
import org.eclipse.jface.wizard.WizardDialog;
import org.eclipse.ui.PlatformUI;
import org.knime.core.node.workflow.NodeTimer;
import org.knime.gateway.api.service.GatewayException;
import org.knime.gateway.impl.webui.spaces.Space;
import org.knime.workbench.explorer.localworkspace.LocalWorkspaceFileStore;
import org.knime.workbench.explorer.view.ContentObject;
import org.knime.workbench.explorer.view.actions.export.WorkflowExportWizard;

/**
 * API functions related with export workflow, folders, etc.
 *
 * @author baqueroj
 */
final class ExportAPI {

    private ExportAPI() {
        // stateless
    }

    /**
     * Export workflows into a .knwf file or folders into a .knar file
     *
     * @return Success state
     * @throws GatewayException -
     */
    @API
    static boolean exportSpaceItem(final String spaceProviderId, final String spaceId, final String itemId)
        throws GatewayException {
        final var space = DesktopAPI.getSpace(spaceProviderId, spaceId);
        final var success = openExportWizard(space, itemId);
        if (success) {
            NodeTimer.GLOBAL_TIMER.incWorkflowExport();
        }
        return success;
    }

    /**
     * @param space space that contains the item to export
     * @param itemId id of the item to export
     *
     * @return true if the legacy workbench dialog has not been exited via "Cancel"
     */
    static boolean openExportWizard(final Space space, final String itemId) {
        final var workbench = PlatformUI.getWorkbench();
        final var shell = workbench.getModalDialogShellProvider().getShell();
        final var itemUri = space.toKnimeUrl(itemId);
        return workbench.getDisplay().syncCall(() -> {
            final var exportWizard = new WorkflowExportWizard();
            final var fileStore = new LocalWorkspaceFileStore(itemUri.getHost(), itemUri.getPath());
            final var item = ContentObject.forFile(fileStore);
            exportWizard.init(workbench, new StructuredSelection(item));
            final var dialog = new WizardDialog(shell, exportWizard);
            dialog.create();
            return dialog.open() != Window.CANCEL;
        });
    }
}
