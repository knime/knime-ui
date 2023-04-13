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

import static org.knime.ui.java.util.PerspectiveUtil.SHARED_EDITOR_AREA_ID;

import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.text.ParseException;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

import javax.xml.xpath.XPathExpressionException;

import org.eclipse.core.filesystem.EFS;
import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.e4.ui.workbench.modeling.EModelService;
import org.eclipse.swt.widgets.Display;
import org.eclipse.ui.IEditorInput;
import org.eclipse.ui.PartInitException;
import org.eclipse.ui.PlatformUI;
import org.eclipse.ui.ide.FileStoreEditorInput;
import org.knime.core.node.InvalidSettingsException;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.util.CheckUtils;
import org.knime.core.node.workflow.NodeTimer;
import org.knime.core.node.workflow.NodeTimer.GlobalNodeStats.WorkflowType;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.core.node.workflow.WorkflowPersistor;
import org.knime.core.node.workflow.contextv2.HubSpaceLocationInfo;
import org.knime.core.node.workflow.contextv2.WorkflowContextV2;
import org.knime.core.util.workflowalizer.Workflowalizer;
import org.knime.core.util.workflowalizer.WorkflowalizerConfiguration;
import org.knime.gateway.impl.project.WorkflowProject;
import org.knime.gateway.impl.project.WorkflowProject.Origin;
import org.knime.gateway.impl.project.WorkflowProjectManager;
import org.knime.gateway.impl.webui.AppStateUpdater;
import org.knime.gateway.impl.webui.spaces.Space.NameCollisionHandling;
import org.knime.gateway.impl.webui.spaces.SpaceProviders;
import org.knime.gateway.impl.webui.spaces.local.LocalWorkspace;
import org.knime.ui.java.api.SpaceDestinationPicker.Operation;
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
import org.xml.sax.SAXException;

/**
 * Opens a workflow.
 *
 * @author Benjamin Moser, KNIME GmbH, Konstanz, Germany
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public final class OpenWorkflow {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(OpenWorkflow.class);

    private OpenWorkflow() {
       // utility
    }

    public static void openArchives(final List<File> archives) {
        for (final var archive : archives) {
            final var fileName = archive.getName();
            if (fileName.toLowerCase(Locale.ROOT).endsWith(".knwf")) {
                final var name0 = fileName.substring(0, fileName.length() - 5);
                try {
                    final var workflowInfo = Workflowalizer.readWorkflow(archive.toPath(),
                        WorkflowalizerConfiguration.builder().readWorkflowMeta().build());
                    final var name1 = workflowInfo.getName();
                    final var name2 = workflowInfo.getWorkflowSetMetadata().get().getTitle().get();
                } catch (final XPathExpressionException | IOException | InvalidSettingsException | ParseException
                        | SAXException e) {
                    // TODO Auto-generated catch block
                }
            }
            // import KNAR contents
            final var location = pickImportLocation();
            if (location.isPresent()) {
                Display.getDefault().syncExec(() -> {
                    DesktopAPUtil.runWithProgress("Import KNIME Workflow Archive", LOGGER, monitor -> {
                        ImportAPI.IMPORT_WORKFLOWS.importItems(monitor, LocalSpaceUtil.getLocalWorkspace(),
                            location.get().getItemId(), List.of(archive.toPath()), NameCollisionHandling.AUTORENAME);
                        return null;
                    });
                });
            }
//            final var name = archive.getName();
//            if (name.toLowerCase(Locale.ROOT).endsWith(".knwf")) {
//                final var prefix = name.substring(0, name.length() - 5);
//                final var dir = DesktopAPUtil.runWithProgress("Import KNIME Workflow Archive", LOGGER, monitor -> {
//                    try {
//                        final var tempDir = ExplorerMountTable.createExplorerTempDir(prefix);
//                        new TempExtractArchive(archive, tempDir, false, null, monitor).runSync(monitor);
//                        return tempDir.toLocalFile().toPath();
//                    } catch (CoreException e) {
//                        LOGGER.warn("Opening archive '" + archive + "' as temporary workflow failed.", e);
//                    }
//                    return null;
//                });
//                if (dir.isPresent()) {
//                    if (PerspectiveUtil.isClassicPerspectiveLoaded()) {
//                        OpenWorkflow.openWorkflowInClassicAndWebUI(spaceProviderId, spaceId, itemId);
//                    } else {
//                        DesktopAPUtil.runWithProgress("Loading workflow", LOGGER, monitor -> {
//                            OpenWorkflow.openWorkflowInWebUIOnly(spaceProviderId, spaceId, itemId, monitor);
//                            return null;
//                        });
//                    }
//                }
//            } else {
//            }
        }
    }

    private static Optional<Origin> pickImportLocation() {
        final var target = SpaceDestinationPicker.promptForTargetLocation(new String[] { "LOCAL" }, Operation.SAVE);
        if (target.isEmpty()) {
            return Optional.empty();
        }

        final var destination = target.get().getDestination();
        try {
            final var localPath = destination.toLocalFile().toPath();
            return Optional.of(LocalSpaceUtil.getLocalOrigin(localPath));
        } catch (CoreException e) {
            LOGGER.warn("Local target '" + destination + "' can't be opened.", e);
            return Optional.empty();
        }
    }

    public static void openURLs(final List<URI> urls) {
        for (final var url : urls) {
            final var fileStore = ExplorerFileSystem.INSTANCE.getStore(url);
            final var info = fileStore.fetchInfo();
            if (!(info.exists() && info.isWorkflow())) {
                // not a workflow, skip
                continue;
            }

            final var mountId = fileStore.getMountID();
            if (fileStore instanceof LocalExplorerFileStore localStore) {
                try {
                    final var workflowPath = localStore.toLocalFile().toPath();
                    final var origin = LocalSpaceUtil.getLocalOrigin(workflowPath);
                    WorkflowAPI.openWorkflow(origin.getSpaceId(), origin.getItemId(), origin.getProviderId());
                } catch (CoreException e) {
                    LOGGER.warn("Local workflow '" + url + "' can't be opened.", e);
                }
            }

            if (fileStore.locationInfo().orElseThrow() instanceof HubSpaceLocationInfo hubLocation) {
                WorkflowAPI.openWorkflow(hubLocation.getSpaceItemId(), hubLocation.getWorkflowItemId(), mountId);
            }
        }
    }

    static WorkflowProject createWorkflowProject(final WorkflowManager wfm, final Origin origin,
            final String oldProjectId) {
        var projectId = oldProjectId == null ? LocalSpaceUtil.getUniqueProjectId(wfm.getName()) : oldProjectId;
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
                return Optional.ofNullable(origin);
            }
        };
    }

    /**
     * Opens the workflow in both, the Classic UI and the Modern/Web UI (the
     *
     * @param spaceId
     * @param itemId
     * @param spaceProviderId
     */
    static void openWorkflowInClassicAndWebUI(final String spaceProviderId, final String spaceId, final String itemId) {
        final var space = SpaceProviders.getSpace(DesktopAPI.getDeps(SpaceProviders.class), spaceProviderId, spaceId);
        var knimeUrl = space.toKnimeUrl(itemId);

        try {
            openEditor(ExplorerFileSystem.INSTANCE.getStore(knimeUrl));
            hideSharedEditorArea();
            ClassicWorkflowEditorUtil.updateWorkflowProjectsFromOpenedWorkflowEditors();
            DesktopAPI.getDeps(AppStateUpdater.class).updateAppState();
        } catch (PartInitException | IllegalArgumentException e) { // NOSONAR
            LOGGER.warn("Could not open editor", e);
        }
    }

    static void registerWorkflowProject(final WorkflowManager wfm, final Origin origin) {
        var wpm = WorkflowProjectManager.getInstance();
        var wfProj = createWorkflowProject(wfm, origin, null);
        var projectId = wfProj.getID();
        wpm.addWorkflowProject(projectId, wfProj);
        wpm.openAndCacheWorkflow(projectId);
        wpm.setWorkflowProjectActive(projectId);
    }

    /**
     * Opens the workflow in the Modern/Web UI. Those workflows won't be available in the classic UI when switching to
     * it.
     *
     * @param spaceId
     * @param itemId
     * @param spaceProviderId
     * @param monitor
     */
    static void openWorkflowInWebUIOnly(final String spaceProviderId, final String spaceId,
        final String itemId, final IProgressMonitor monitor) {
        final var space = SpaceProviders.getSpace(DesktopAPI.getDeps(SpaceProviders.class), spaceProviderId, spaceId);
        var wfm = DesktopAPUtil.loadWorkflow(space, itemId, monitor);

        if (wfm != null) {
            String relativePath = null;
            var workflowType = WorkflowType.REMOTE;
            if (space instanceof LocalWorkspace localWorkspace) {
                workflowType = WorkflowType.LOCAL;
                var wfPath = wfm.getContextV2().getExecutorInfo().getLocalWorkflowPath();
                relativePath = localWorkspace.getLocalRootPath().relativize(wfPath).toString();
            }

            registerWorkflowProject(wfm, Origin.create(spaceProviderId, spaceId, itemId, relativePath));
            NodeTimer.GLOBAL_TIMER.incWorkflowOpening(wfm, workflowType);

            DesktopAPI.getDeps(AppStateUpdater.class).updateAppState();
        }
    }

    /**
     * Open an editor for the given file store in the shared editor area.
     *
     * @param fileStore The file store for the editor.
     * @throws PartInitException If the editor part could not be initialized.
     */
    private static void openEditor(final AbstractExplorerFileStore fileStore) throws PartInitException {
        final IEditorInput input;
        if (fileStore instanceof RemoteExplorerFileStore remoteStore) {
            final var tempInput = DesktopAPUtil.runWithProgress("Download workflow", LOGGER,
                progress -> downloadWorkflowFromMountpoint(progress, remoteStore));
            if (tempInput.isEmpty()) {
                return;
            }
            input = tempInput.get();
        } else {
            input = new FileStoreEditorInput(fileStore.getChild(WorkflowPersistor.WORKFLOW_FILE));
        }
        final var page = PlatformUI.getWorkbench().getActiveWorkbenchWindow().getActivePage();
        page.openEditor(input, WorkflowEditor.ID, false);
    }

    /**
     * Downloads a remote workflow into a temporary directory. This code is heavily inspired by the
     * {@link DownloadAndOpenWorkflowAction}.
     *
     * @param source source file store
     * @return
     */
    private static RemoteWorkflowInput downloadWorkflowFromMountpoint(final IProgressMonitor progress,
            final RemoteExplorerFileStore source) {
        final LocalExplorerFileStore tmpDestDir;
        try {
            // fetch the actual name from the remote side because `source.getName()` may only return the repository ID
            // at that is not always a valid directory name
            final var name = source.fetchInfo().getName();
            tmpDestDir = ExplorerMountTable.createExplorerTempDir(name).getChild(name);
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
        var workbench = (org.eclipse.ui.internal.Workbench)PlatformUI.getWorkbench();
        var modelService = workbench.getService(EModelService.class);
        var app = workbench.getApplication();
        var areaPlaceholder = modelService.find(
                SHARED_EDITOR_AREA_ID,
                PerspectiveUtil.getWebUIPerspective(app, modelService)
        );
        areaPlaceholder.setVisible(false);
    }
}
