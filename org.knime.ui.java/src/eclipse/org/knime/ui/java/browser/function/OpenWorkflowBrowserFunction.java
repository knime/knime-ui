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

import static org.knime.ui.java.util.PerspectiveUtil.SHARED_EDITOR_AREA_ID;

import java.net.URI;
import java.util.Optional;

import org.eclipse.core.filesystem.EFS;
import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.e4.ui.workbench.modeling.EModelService;
import org.eclipse.ui.IEditorInput;
import org.eclipse.ui.PartInitException;
import org.eclipse.ui.PlatformUI;
import org.eclipse.ui.ide.FileStoreEditorInput;
import org.eclipse.ui.internal.Workbench;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.util.CheckUtils;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.core.node.workflow.WorkflowPersistor;
import org.knime.core.node.workflow.contextv2.WorkflowContextV2;
import org.knime.core.node.workflow.contextv2.WorkflowContextV2.LocationType;
import org.knime.gateway.impl.project.WorkflowProject;
import org.knime.gateway.impl.project.WorkflowProjectManager;
import org.knime.gateway.impl.webui.AppStateUpdater;
import org.knime.gateway.impl.webui.service.DefaultSpaceService;
import org.knime.ui.java.util.ClassicWorkflowEditorUtil;
import org.knime.ui.java.util.DesktopAPUtil;
import org.knime.ui.java.util.LocalSpaceUtil;
import org.knime.ui.java.util.PerspectiveUtil;
import org.knime.workbench.editor2.WorkflowEditor;
import org.knime.workbench.explorer.ExplorerMountTable;
import org.knime.workbench.explorer.RemoteWorkflowInput;
import org.knime.workbench.explorer.filesystem.AbstractExplorerFileStore;
import org.knime.workbench.explorer.filesystem.ExplorerFileSystem;
import org.knime.workbench.explorer.filesystem.LocalExplorerFileStore;
import org.knime.workbench.explorer.filesystem.RemoteExplorerFileStore;
import org.knime.workbench.explorer.view.actions.DownloadAndOpenWorkflowAction;
import org.knime.workbench.explorer.view.actions.WorkflowDownload;

import com.equo.chromium.swt.Browser;
import com.equo.chromium.swt.BrowserFunction;

/**
 * Opens a workflow.
 *
 * @author Benjamin Moser, KNIME GmbH, Konstanz, Germany
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public class OpenWorkflowBrowserFunction extends BrowserFunction {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(OpenWorkflowBrowserFunction.class);

    private final AppStateUpdater m_appStateUpdater;

    @SuppressWarnings("javadoc")
    public OpenWorkflowBrowserFunction(final Browser browser, final AppStateUpdater appStateUpdater) {
        super(browser, "openWorkflow");
        m_appStateUpdater = appStateUpdater;
    }

    /**
     * Opens the workflow either in both, the Classic UI and the Modern/Web UI if the classic UI is active (the
     * WorkflowEditor is used in that case to open the workflow). Or it opens and loads the workflow exclusively in the
     * Modern UI. Those workflows won't be available in the classic UI when switching to it.
     *
     * @param arguments space-id (0), item-id (1) and space-provider-id (2, {@code "local"} if absent); never null
     * @return always {@code null}
     */
    @Override
    public Object function(final Object[] arguments) {
        var spaceId = (String)arguments[0];
        var itemId = (String)arguments[1];
        final var spaceProviderId =
                arguments.length < 3 ? LocalSpaceUtil.LOCAL_SPACE_PROVIDER_ID : (String)arguments[2];

        final var space = DefaultSpaceService.getInstance().getSpace(spaceId, spaceProviderId);

        if (PerspectiveUtil.isClassicPerspectiveLoaded()) {
            openWorkflowInClassicAndWebUIPerspective(space.toKnimeUrl(itemId));
        } else {
            DesktopAPUtil.openWorkflowInWebUIPerspectiveOnly(space, itemId).ifPresent(wfm -> {
                String relativePath = null;
                if (wfm.getContextV2().getLocationType() == LocationType.LOCAL) {
                    relativePath = LocalSpaceUtil
                        .toRelativePath(wfm.getContextV2().getExecutorInfo().getLocalWorkflowPath()).toString();
                }
                registerWorkflowProject(wfm, spaceProviderId, spaceId, itemId, relativePath);
            });
        }
        m_appStateUpdater.updateAppState();

        return null;
    }

    private static void registerWorkflowProject(final WorkflowManager wfm, final String spaceProviderId,
        final String spaceId, final String itemId, final String relativePath) {
        var wpm = WorkflowProjectManager.getInstance();
        var wfProj = createWorkflowProject(wfm, spaceProviderId, spaceId, itemId, relativePath);
        var projectId = wfProj.getID();
        wpm.addWorkflowProject(projectId, wfProj);
        wpm.openAndCacheWorkflow(projectId);
        wpm.setWorkflowProjectActive(projectId);
    }

    private static WorkflowProject createWorkflowProject(final WorkflowManager wfm, final String providerId,
        final String spaceId, final String itemId, final String relativePath) {
        var projectId = LocalSpaceUtil.getUniqueProjectId(wfm.getName());
        return new WorkflowProject() { // NOSONAR
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

            @Override
            public Optional<Origin> getOrigin() {
                return Optional.of(new Origin() {
                    @Override
                    public String getProviderId() {
                        return providerId;
                    }

                    @Override
                    public String getSpaceId() {
                        return spaceId;
                    }

                    @Override
                    public String getItemId() {
                        return itemId;
                    }

                    @Override
                    public Optional<String> getRelativePath() {
                        return Optional.ofNullable(relativePath);
                    }
                });
            }
        };
    }

    private static void openWorkflowInClassicAndWebUIPerspective(final URI knimeUrl) {
        try {
            openEditor(ExplorerFileSystem.INSTANCE.getStore(knimeUrl));
            hideSharedEditorArea();
            ClassicWorkflowEditorUtil.updateWorkflowProjectsFromOpenedWorkflowEditors();
        } catch (PartInitException | IllegalArgumentException e) { // NOSONAR
            LOGGER.warn("Could not open editor", e);
        }
    }

    /**
     * Open an editor for the given file store in the shared editor area.
     *
     * @param fileStore The file store for the editor.
     * @throws PartInitException If the editor part could not be initialized.
     */
    private static void openEditor(final AbstractExplorerFileStore fileStore) throws PartInitException {
        var page = PlatformUI.getWorkbench().getActiveWorkbenchWindow().getActivePage();
        final IEditorInput input;
        if (fileStore instanceof RemoteExplorerFileStore) {
            final var tempInput = DesktopAPUtil.runWithProgress("Download workflow", LOGGER,
                progress -> downloadWorkflowFromMountpoint(progress, (RemoteExplorerFileStore)fileStore));
            if (tempInput.isEmpty()) {
                return;
            }
            input = tempInput.get();
        } else {
            input = new FileStoreEditorInput(fileStore);
        }
        page.openEditor(input, WorkflowEditor.ID, false);
    }

    /**
     * Downloads a remote workflow into a temporary directory. This code is heavily inspired by the
     * {@link DownloadAndOpenWorkflowAction}.
     *
     * @param source source file store
     * @return
     */
    private static final RemoteWorkflowInput downloadWorkflowFromMountpoint(final IProgressMonitor progress,
            final RemoteExplorerFileStore source) {
        final LocalExplorerFileStore tmpDestDir;
        try {
            tmpDestDir = ExplorerMountTable.createExplorerTempDir(source.getName()).getChild(source.getName());
            tmpDestDir.mkdir(EFS.NONE, progress);
        } catch (CoreException e1) {
            throw new IllegalStateException(e1);
        }

        final String[] content;
        try {
            new WorkflowDownload(source, tmpDestDir, false, null, progress).runSync(progress);
            content = tmpDestDir.childNames(EFS.NONE, progress);
            if (content == null || content.length == 0) {
                tmpDestDir.delete(EFS.NONE, progress);
                throw new IllegalStateException("Error during download: No content available.");
            }
        } catch (CoreException e) {
            throw new IllegalStateException(e);

        }

        // it is weird if the length is not 1 (because we downloaded one item)
        var workflowDir = content.length == 1 ? tmpDestDir.getChild(content[0]) : tmpDestDir;
        if (workflowDir.fetchInfo().isDirectory()) {
            final LocalExplorerFileStore wf = workflowDir.getChild(WorkflowPersistor.WORKFLOW_FILE);
            if (wf.fetchInfo().exists()) {
                workflowDir = wf;
            } else {
                // directories that are not workflows cannot be opened
                throw new IllegalStateException("Cannot open downloaded content: Directory doesn't contain a workflow");
            }
        }

        final WorkflowContextV2 context;
        try {
            final var localWorkflowPath = workflowDir.getParent().toLocalFile().toPath();
            final var mountpointRoot = workflowDir.getContentProvider().getRootStore().toLocalFile().toPath();
            final var locationInfo = CheckUtils.checkNotNull(source.locationInfo().orElse(null),
                "Location info could not be determined for " + source);
            context = WorkflowContextV2.builder()
                    .withAnalyticsPlatformExecutor(builder -> builder
                        .withCurrentUserAsUserId()
                        .withLocalWorkflowPath(localWorkflowPath)
                        .withMountpoint(source.getMountID(), mountpointRoot))
                        .withLocation(locationInfo)
                        .build();
        } catch (CoreException e) {
            throw new IllegalStateException(e);
        }

        return new RemoteWorkflowInput(workflowDir, context);
    }

    @SuppressWarnings("restriction")
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
