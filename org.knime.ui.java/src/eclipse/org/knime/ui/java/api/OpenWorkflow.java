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

import java.net.URI;
import java.util.Optional;

import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.e4.ui.workbench.modeling.EModelService;
import org.eclipse.ui.PartInitException;
import org.eclipse.ui.PlatformUI;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.workflow.NodeTimer;
import org.knime.core.node.workflow.NodeTimer.GlobalNodeStats.WorkflowType;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.core.node.workflow.contextv2.HubSpaceLocationInfo;
import org.knime.gateway.impl.project.WorkflowProject;
import org.knime.gateway.impl.project.WorkflowProjectManager;
import org.knime.gateway.impl.webui.AppStateUpdater;
import org.knime.gateway.impl.webui.spaces.SpaceProviders;
import org.knime.gateway.impl.webui.spaces.local.LocalWorkspace;
import org.knime.ui.java.util.ClassicWorkflowEditorUtil;
import org.knime.ui.java.util.DesktopAPUtil;
import org.knime.ui.java.util.LocalSpaceUtil;
import org.knime.ui.java.util.PerspectiveUtil;
import org.knime.workbench.core.imports.RepoObjectImport;
import org.knime.workbench.explorer.RemoteWorkflowInput;
import org.knime.workbench.explorer.filesystem.ExplorerFileSystem;
import org.knime.workbench.explorer.filesystem.RemoteExplorerFileStore;

/**
 * Opens a workflow.
 *
 * @author Benjamin Moser, KNIME GmbH, Konstanz, Germany
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
final class OpenWorkflow {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(OpenWorkflow.class);

    private OpenWorkflow() {
       // utility
    }

    /**
     * Open a workflow project from a mounted space
     *
     * @param spaceId The ID of the space the item is in
     * @param itemId The item ID of the workflow to open
     * @param spaceProviderId The ID of the space provider of the space
     */
    static void openWorkflow(final String spaceId, final String itemId, final String spaceProviderId) {
        if (PerspectiveUtil.isClassicPerspectiveLoaded()) {
            final var space =
                SpaceProviders.getSpace(DesktopAPI.getDeps(SpaceProviders.class), spaceProviderId, spaceId);
            var knimeUrl = space.toKnimeUrl(itemId);
            openWorkflowInClassicAndWebUI(knimeUrl);
        } else {
            DesktopAPUtil.runWithProgress(DesktopAPUtil.LOADING_WORKFLOW_PROGRESS_MSG, LOGGER, monitor -> { // NOSONAR better than inline class
                OpenWorkflow.fetchAndOpenWorkflowInWebUIOnly(spaceProviderId, spaceId, itemId, monitor);
                return null;
            });
        }
    }

    /**
     * Fetch and open a local copy of a workflow sourced from the given import (e.g. by dropping an URI)
     *
     * @apiNote While opening a workflow form a mounted remote space may also open them as local copies, the behaviour
     *          of these two cases is different w.r.t. interaction with the space explorer, opening and saving.
     * @param repoObjectImport The source of the workflow
     * @return Whether the workflow could be fetched and opened
     */
    static boolean openWorkflowCopy(final RepoObjectImport repoObjectImport) {
        if (PerspectiveUtil.isClassicPerspectiveLoaded()) {
            openWorkflowInClassicAndWebUI(repoObjectImport.getKnimeURI());
        } else {
            var wfm = fetchAndLoadWorkflowWithProgress(repoObjectImport);
            if (wfm == null) {
                return false;
            }
            openWorkflowInWebUIOnly(wfm, createWorkflowProject(wfm), WorkflowType.REMOTE);
        }
        return true;
    }

    /**
     * Opens the workflow in both the Classic UI and the Modern/Web UI
     *
     * @param knimeUrl The knime:// URI identifying the source of the workflow to load
     */
    private static void openWorkflowInClassicAndWebUI(final URI knimeUrl) {
        try {
            DesktopAPUtil.openEditor(ExplorerFileSystem.INSTANCE.getStore(knimeUrl));
            hideSharedEditorArea();
            ClassicWorkflowEditorUtil.updateWorkflowProjectsFromOpenedWorkflowEditors();
            DesktopAPI.getDeps(AppStateUpdater.class).updateAppState();
        } catch (PartInitException | IllegalArgumentException e) { // NOSONAR
            LOGGER.warn("Could not open editor", e);
        }
    }

    /**
     * Fetch, load, and open the workflow in the Modern/Web UI. Those workflows won't be available in the classic UI
     * when switching to it.
     *
     * @implNote Needs to be standalone (not wrapped in progress manager) to be testable.
     * @param spaceId
     * @param itemId
     * @param spaceProviderId
     * @param monitor
     */
    static void fetchAndOpenWorkflowInWebUIOnly(final String spaceProviderId, final String spaceId, final String itemId,
        final IProgressMonitor monitor) {
        final var space = SpaceProviders.getSpace(DesktopAPI.getDeps(SpaceProviders.class), spaceProviderId, spaceId);
        var wfm = DesktopAPUtil.fetchAndLoadWorkflowWithTask(space, itemId, monitor);
        if (wfm == null) {
            return;
        }
        String relativePath = null;
        if (space instanceof LocalWorkspace localWorkspace) {
            var wfPath = wfm.getContextV2().getExecutorInfo().getLocalWorkflowPath();
            relativePath = localWorkspace.getLocalRootPath().relativize(wfPath).toString();
        }
        var wfProj = createWorkflowProject(wfm, spaceProviderId, spaceId, itemId, relativePath);
        openWorkflowInWebUIOnly(wfm, wfProj,
            space instanceof LocalWorkspace ? WorkflowType.LOCAL : WorkflowType.REMOTE);
    }

    private static void openWorkflowInWebUIOnly(final WorkflowManager wfm, final WorkflowProject wfProj,
        final WorkflowType type) {
        // register workflow project
        var wpm = WorkflowProjectManager.getInstance();
        wpm.addWorkflowProject(wfProj.getID(), wfProj);
        wpm.openAndCacheWorkflow(wfProj.getID());
        wpm.setWorkflowProjectActive(wfProj.getID());
        // instrumentation
        NodeTimer.GLOBAL_TIMER.incWorkflowOpening(wfm, type);
        // update application state
        DesktopAPI.getDeps(AppStateUpdater.class).updateAppState();
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
        var areaPlaceholder =
            modelService.find(SHARED_EDITOR_AREA_ID, PerspectiveUtil.getWebUIPerspective(app, modelService));
        areaPlaceholder.setVisible(false);
    }

    private static WorkflowManager fetchAndLoadWorkflowWithProgress(final RepoObjectImport repoObjectImport) {
        var knimeUrl = repoObjectImport.getKnimeURI();
        var hubSpaceLocationInfo = (HubSpaceLocationInfo)repoObjectImport.locationInfo().orElseThrow();
        var fs = (RemoteExplorerFileStore)ExplorerFileSystem.INSTANCE.getStore(knimeUrl);
        return DesktopAPUtil.downloadWorkflowWithProgress(fs, hubSpaceLocationInfo) //
            .map(RemoteWorkflowInput::getWorkflowContext) //
            .flatMap(DesktopAPUtil::loadWorkflowWithProgress) //
            .orElse(null);
    }

    public static WorkflowProject createWorkflowProject(final WorkflowManager wfm, final String providerId,
        final String spaceId, final String itemId, final String relativePath, final String oldProjectId) {
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

    public static WorkflowProject createWorkflowProject(final WorkflowManager wfm, final String spaceProviderId,
        final String spaceId, final String itemId, final String relativePath) {
        return createWorkflowProject(wfm, spaceProviderId, spaceId, itemId, relativePath, null);
    }

    public static WorkflowProject createWorkflowProject(final WorkflowManager wfm) {
        var projectId = LocalSpaceUtil.getUniqueProjectId(wfm.getName());
        return new WorkflowProject() {
            @Override
            public String getName() {
                return wfm.getName();
            }

            @Override
            public String getID() {
                return projectId;
            }

            @Override
            public WorkflowManager openProject() {
                return wfm;
            }
        };
    }
}
