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

import static org.knime.ui.java.PerspectiveUtil.SHARED_EDITOR_AREA_ID;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import org.eclipse.e4.ui.model.application.MApplication;
import org.eclipse.e4.ui.workbench.modeling.EModelService;
import org.eclipse.jface.window.Window;
import org.eclipse.swt.graphics.Point;
import org.eclipse.swt.widgets.Display;
import org.eclipse.ui.IEditorDescriptor;
import org.eclipse.ui.PartInitException;
import org.eclipse.ui.PlatformUI;
import org.eclipse.ui.ide.FileStoreEditorInput;
import org.eclipse.ui.ide.IDE;
import org.eclipse.ui.internal.Workbench;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.workflow.WorkflowPersistor;
import org.knime.gateway.impl.webui.AppStateProvider;
import org.knime.ui.java.PerspectiveUtil;
import org.knime.workbench.explorer.ExplorerMountTable;
import org.knime.workbench.explorer.dialogs.SpaceResourceSelectionDialog;
import org.knime.workbench.explorer.dialogs.Validator;
import org.knime.workbench.explorer.filesystem.AbstractExplorerFileStore;
import org.knime.workbench.explorer.filesystem.LocalExplorerFileStore;
import org.knime.workbench.explorer.localworkspace.LocalWorkspaceContentProvider;
import org.knime.workbench.explorer.view.AbstractContentProvider;

import com.equo.chromium.swt.Browser;
import com.equo.chromium.swt.BrowserFunction;

/**
 * Display a workflow selection popup and open selected workflow.
 *
 * @author Benjamin Moser, KNIME GmbH, Konstanz, Germany
 */
public class OpenWorkflowBrowserFunction extends BrowserFunction {

    private final AppStateProvider m_appStateProvider;


    public OpenWorkflowBrowserFunction(final Browser browser, final AppStateProvider appStateProvider) {
        super(browser, "openWorkflow");
        m_appStateProvider = appStateProvider;
    }

    /**
     * Display a selection popup for workflows in the LOCAL mountpoint. On selection, opens and loads the selected
     * workflow and opens an editor part in the Java UI. Having an editor part open for each open workflow is required
     * for saving the workflow, see NXT-622. If the workflow is already open, this will make the editor part be the
     * selected element in the shared editor area (i.e. the "tab" in the UI is active).
     *
     * @param arguments No parameters expected, parameter is ignored.
     * @return always {@code null}
     */
    @Override
    @SuppressWarnings("java:S3516")  // same return value
    public Object function(final Object[] arguments) {

        Optional<LocalExplorerFileStore> selectedFileStore = prompt();
        if (selectedFileStore.isEmpty()) {
            return null;
        }

        try {
            openEditor(selectedFileStore.get());
            hideSharedEditorArea();
        } catch (PartInitException | IllegalArgumentException e) {  // NOSONAR
            NodeLogger.getLogger(this.getClass()).warn("Could not open editor", e);
            return null;
        }

        m_appStateProvider.updateAppState();
        return null;
    }

    /**
     * Open an editor for the given file store in the shared editor area.
     *
     * @param fileStore The file store for the editor.
     * @throws PartInitException If the editor part could not be initialised.
     */
    private static void openEditor(final LocalExplorerFileStore fileStore) throws PartInitException {
        var input = new FileStoreEditorInput(fileStore);
        final IEditorDescriptor editorDescriptor = IDE.getEditorDescriptor(input.getName(), true, true);
        var page = PlatformUI.getWorkbench().getActiveWorkbenchWindow().getActivePage();
        page.openEditor(input, editorDescriptor.getId(), false);
    }

    private static Optional<LocalExplorerFileStore> prompt() {
        AtomicReference<AbstractExplorerFileStore> selection = new AtomicReference<>();
        Display.getDefault().syncExec(() -> {  // NOSONAR
            // Only list local mountpoints.
            var mountIds = ExplorerMountTable.getMountedContent().entrySet().stream().filter(entry -> {
                AbstractContentProvider acp = entry.getValue();
                return (acp instanceof LocalWorkspaceContentProvider);
            }).map(Map.Entry::getKey).toArray(String[]::new);

            var dialog = new SpaceResourceSelectionDialog(
                    Display.getDefault().getActiveShell(),
                    mountIds,
                    null,
                    new Point(625, 900));
            dialog.setInitTreeLevel(2);
            dialog.setResultPanelEnabled(false);
            dialog.setTitle("Open KNIME Workflow");
            dialog.setDescription("Select a workflow.");
            dialog.setValidator(new ResourceSelectionValidator());

            int choice = dialog.open();
            if (choice == Window.OK) {
                selection.set(dialog.getSelection());
            } else {
                selection.set(null);
            }
        });

        return Optional.ofNullable(selection.getAcquire()).filter(LocalExplorerFileStore.class::isInstance)
            .map(LocalExplorerFileStore.class::cast)
            .map(fileStore -> {
                // Dialog provides the directory, but we need the file store for the workflow.knime file.
                LocalExplorerFileStore workflowFile = fileStore.getChild(WorkflowPersistor.WORKFLOW_FILE);
                if (workflowFile.fetchInfo().exists()) {
                    return workflowFile;
                } else {
                    return null;
                }
            });
    }

    /**
     * Validator for entries in the workflow selection dialog.
     */
    private static final class ResourceSelectionValidator extends Validator {
        @Override
        public String validateSelectionValue(final AbstractExplorerFileStore selection, final String currentName) {
            if (!AbstractExplorerFileStore.isWorkflow(selection)) {
                return "Please select a workflow.";
            }
            return null;
        }
    }


    private static void hideSharedEditorArea() {
        // Set editor area to non-visible again (WorkbenchPage#openEditor sets it to active).
        // Even though the part has zero size in its container, the renderer will still show a few pixels,
        //   and on these pixels a drag listener is active, allowing to resize the part.
        // This workaround results in these pixels being shown while the workflow is loading, causing a slight
        //   shift back and forth of the Web UI view.
        var workbench = (Workbench)PlatformUI.getWorkbench();
        var modelService = workbench.getService(EModelService.class);
        var app = workbench.getApplication();
        var areaPlaceholder = modelService.find(
                SHARED_EDITOR_AREA_ID,
                PerspectiveUtil.getWebUIPerspective(app, modelService)
        );
        areaPlaceholder.setVisible(false);
    }


}
