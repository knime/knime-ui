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
import static org.knime.ui.java.browser.function.SaveWorkflowBrowserFunction.showWarningAndLogError;

import java.lang.reflect.InvocationTargetException;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.file.Path;

import org.eclipse.e4.ui.workbench.modeling.EModelService;
import org.eclipse.ui.PartInitException;
import org.eclipse.ui.PlatformUI;
import org.eclipse.ui.ide.FileStoreEditorInput;
import org.eclipse.ui.internal.Workbench;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.core.node.workflow.WorkflowPersistor;
import org.knime.core.node.workflow.contextv2.LocalLocationInfo;
import org.knime.core.node.workflow.contextv2.WorkflowContextV2;
import org.knime.gateway.impl.project.WorkflowProject;
import org.knime.gateway.impl.project.WorkflowProjectManager;
import org.knime.gateway.impl.webui.AppStateProvider;
import org.knime.gateway.impl.webui.LocalWorkspace;
import org.knime.gateway.impl.webui.service.DefaultSpaceService;
import org.knime.ui.java.PerspectiveUtil;
import org.knime.workbench.editor2.LoadWorkflowRunnable;
import org.knime.workbench.editor2.WorkflowEditor;
import org.knime.workbench.explorer.filesystem.ExplorerFileSystem;
import org.knime.workbench.explorer.filesystem.LocalExplorerFileStore;
import org.knime.workbench.explorer.localworkspace.LocalWorkspaceFileStore;

import com.equo.chromium.swt.Browser;
import com.equo.chromium.swt.BrowserFunction;

/**
 * Opens a workflow.
 *
 * @author Benjamin Moser, KNIME GmbH, Konstanz, Germany
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public class OpenWorkflowBrowserFunction extends BrowserFunction {

    private final AppStateProvider m_appStateProvider;

    @SuppressWarnings("javadoc")
    public OpenWorkflowBrowserFunction(final Browser browser, final AppStateProvider appStateProvider) {
        super(browser, "openWorkflow");
        m_appStateProvider = appStateProvider;
    }

    /**
     * Opens the workflow either in both, the Classic UI and the Modern/Web UI if the classic UI is active (the
     * WorkflowEditor is used in that case to open the workflow). Or it opens and loads the workflow exclusively in the
     * Modern UI. Those workflows won't be available in the classic UI when switching to it.
     *
     * @param arguments space-id (0) and item-id (1); never null
     * @return always {@code null}
     */
    @Override
    public Object function(final Object[] arguments) {
        var spaceId = (String)arguments[0];
        var itemId = (String)arguments[1];

        var space = DefaultSpaceService.getInstance().getSpace(spaceId);
        var localAbsolutePath = space.toLocalAbsolutePath(itemId);
        if (space instanceof LocalWorkspace) {
            if (PerspectiveUtil.isClassicPerspectiveActive()) {
                var localWorkspaceRoot = ((LocalWorkspace)space).getLocalWorkspaceRoot();
                openWorkflowInClassicAndWebUIPerspective(localWorkspaceRoot.relativize(localAbsolutePath),
                    m_appStateProvider);
            } else {
                openWorkflowInWebUIPerspectiveOnly(localAbsolutePath, m_appStateProvider);
            }
        } else {
            throw new UnsupportedOperationException(
                "Opening a workflow from other then the local workspace is not supported, yet");
        }

        return null;
    }

    private static void openWorkflowInWebUIPerspectiveOnly(final Path absoluteLocalPath,
        final AppStateProvider appStateProvider) {
        var workflowContext = WorkflowContextV2.builder()
            .withAnalyticsPlatformExecutor(builder -> builder.withCurrentUserAsUserId() //
                .withLocalWorkflowPath(absoluteLocalPath)) //
            .withLocation(LocalLocationInfo.getInstance(null)) //
            .build();
        final var progressService = PlatformUI.getWorkbench().getProgressService();
        var loadWorkflowRunnable = new LoadWorkflowRunnable(wfm -> onWorkflowLoaded(wfm, appStateProvider),
            absoluteLocalPath.resolve(WorkflowPersistor.WORKFLOW_FILE).toFile(), workflowContext);
        try {
            progressService.busyCursorWhile(loadWorkflowRunnable);
        } catch (InvocationTargetException e) {
            showWarningAndLogError("Opening workflow failed", e.getMessage(),
                NodeLogger.getLogger(OpenWorkflowBrowserFunction.class), e);
        } catch (InterruptedException e) {
            NodeLogger.getLogger(OpenWorkflowBrowserFunction.class).warn("Opening workflow interrupted");
            Thread.currentThread().interrupt();
        }
    }

    private static void onWorkflowLoaded(final WorkflowManager wfm, final AppStateProvider appStateProvider) {
        var wpm = WorkflowProjectManager.getInstance();
        var projectId = wfm.getNameWithID();
        wpm.addWorkflowProject(projectId, new WorkflowProject() {

            @Override
            public WorkflowManager openProject() {
                return wfm;
            }

            @Override
            public String getName() {
                return wfm.getName();
            }

            @Override
            public String getID() {
                return projectId;
            }
        });
        wpm.openAndCacheWorkflow(projectId);
        wpm.setWorkflowProjectActive(projectId);
        appStateProvider.updateAppState();
    }

    private static void openWorkflowInClassicAndWebUIPerspective(final Path relativePath,
        final AppStateProvider appStateProvider) {
        LocalWorkspaceFileStore fileStore;
        try {
            fileStore = (LocalWorkspaceFileStore)ExplorerFileSystem.INSTANCE
                .getStore(new URI("knime://LOCAL/" + relativePath.toString() + "/" + WorkflowPersistor.WORKFLOW_FILE)); // NOSONAR
        } catch (URISyntaxException e) {
            // should never happen
            throw new IllegalStateException(e);
        }
        try {
            openEditor(fileStore);
            hideSharedEditorArea();
            appStateProvider.updateAppState();
        } catch (PartInitException | IllegalArgumentException e) { // NOSONAR
            NodeLogger.getLogger(OpenWorkflowBrowserFunction.class).warn("Could not open editor", e);
        }
    }

    /**
     * Open an editor for the given file store in the shared editor area.
     *
     * @param fileStore The file store for the editor.
     * @throws PartInitException If the editor part could not be initialised.
     */
    private static void openEditor(final LocalExplorerFileStore fileStore) throws PartInitException {
        var input = new FileStoreEditorInput(fileStore);
        var page = PlatformUI.getWorkbench().getActiveWorkbenchWindow().getActivePage();
        page.openEditor(input, WorkflowEditor.ID, false);
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
