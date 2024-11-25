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
 *   Jan 30, 2023 (hornm): created
 */
package org.knime.ui.java.api;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.function.Predicate;
import java.util.stream.Stream;

import org.eclipse.jface.preference.IPreferenceNode;
import org.eclipse.swt.program.Program;
import org.eclipse.ui.IWorkbenchWindow;
import org.eclipse.ui.PlatformUI;
import org.eclipse.ui.actions.ActionFactory;
import org.eclipse.ui.dialogs.PreferencesUtil;
import org.eclipse.ui.internal.ide.actions.OpenWorkspaceAction;
import org.knime.core.node.KNIMEConstants;
import org.knime.core.node.NodeLogger;
import org.knime.core.ui.workflowcoach.NodeRecommendationManager;
import org.knime.core.ui.workflowcoach.data.NodeTripleProviderFactory;
import org.knime.core.webui.WebUIUtil;
import org.knime.gateway.api.webui.entity.UpdateAvailableEventEnt;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.gateway.impl.webui.AppStateUpdater;
import org.knime.gateway.impl.webui.UpdateStateProvider;
import org.knime.gateway.impl.webui.service.events.EventConsumer;
import org.knime.gateway.impl.webui.spaces.SpaceProviders;
import org.knime.ui.java.api.SaveAndCloseProjects.PostProjectCloseAction;
import org.knime.ui.java.util.PerspectiveUtil;
import org.knime.workbench.ui.p2.actions.InvokeInstallSiteAction;
import org.knime.workbench.ui.p2.actions.InvokeUpdateAction;

/**
 * Functions opening Eclipse-UI elements.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
final class EclipseUIAPI {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(EclipseUIAPI.class);

    private static class PreferencePageIds {

        /** Pages in the 'General' section */
        private static final String APPEARANCE = "org.eclipse.ui.preferencePages.Views";

        private static final String KEYS = "org.eclipse.ui.preferencePages.Keys";

        private static final String STARTUP_SHUTDOWN = "org.eclipse.ui.preferencePages.Startup";

        private static final String WEB_BROWSER = "org.eclipse.ui.browser.preferencePage";

        private static final String WORKSPACE = "org.eclipse.ui.preferencePages.Workspace";

        /** Pages in the 'KNIME' section */
        private static final String MASTER_KEY = "org.knime.workbench.ui.preferences.masterkey";

        private static final String META_INFO = "org.knime.workbench.ui.metainfo";

        private static final String MODERN_UI = "org.knime.ui.java.prefs.KnimeUIPreferencePage";

        private static final String WORKFLOW_COACH = "org.knime.workbench.workflowcoach";

        /** Pages in the 'Report Design' section */
        private static final String REPORT_DESIGN = "org.eclipse.birt.report.designer.ui.preferences";

        /** A list of excluded pages */
        private static final List<String> EXCLUDED = List.of(APPEARANCE, KEYS, STARTUP_SHUTDOWN, WEB_BROWSER,
            WORKSPACE, MASTER_KEY, META_INFO, REPORT_DESIGN);

    }

    private EclipseUIAPI() {
        // stateless
    }

    /**
     * Open the "About"-Dialog of the Eclipse workbench.
     */
    @API
    static void openAboutDialog() {
        var window = PlatformUI.getWorkbench().getActiveWorkbenchWindow();
        ActionFactory.ABOUT.create(window).run();
    }

    /**
     * Invoke the update wizard of the classic UI.
     */
    @API
    static void openUpdateDialog() {
        new InvokeUpdateAction().run();
    }

    /**
     * Checks for updates. If there is one, an {@link UpdateAvailableEventEnt} will be sent.
     */
    @API
    static void checkForUpdates() {
        var updateStateProvider = DesktopAPI.getDeps(UpdateStateProvider.class);
        // can be null when, e.g., switching from classic to modern UI
        // where we don't want to check for updates
        if (updateStateProvider != null) {
            updateStateProvider.checkForUpdates();
        }
    }

    /**
     * Open the "Install Extensions" dialog of the Eclipse workbench.
     */
    @API
    static void openInstallExtensionsDialog() {
        new InvokeInstallSiteAction().run();
    }

    /**
     * Open the preference page for the modern (=web) UI settings
     */
    @API
    static void openWebUIPreferencePage() {
        openPreferencePage(PreferencePageIds.MODERN_UI);
    }

    static void openPreferencePage(final String preferencePageId) {
        var rootSubNodes = PlatformUI.getWorkbench().getPreferenceManager().getRootSubNodes();
        var displayedIds = getFilteredDisplayIds(rootSubNodes);
        var dialog = PreferencesUtil.createPreferenceDialogOn(null, preferencePageId, displayedIds, null);
        dialog.open();

        // Since changing the web-ui settings changes the application state
        DesktopAPI.getDeps(AppStateUpdater.class).updateAppState();

    }

    /**
     * Returns all the display IDs it could find, except the ones filtered out
     */
    static String[] getFilteredDisplayIds(final IPreferenceNode[] nodes) {
        return Arrays.stream(nodes)//
            .filter(node -> !PreferencePageIds.EXCLUDED.contains(node.getId()))//
            .flatMap(parent -> {
                var children = parent.getSubNodes();
                var filteredChildren = getFilteredDisplayIds(children);
                return Stream.concat(Stream.of(parent.getId()), Arrays.stream(filteredChildren));
            })//
            .toArray(String[]::new);
    }

    /**
     * Browser function opening the workflow coach preference pages
     */
    @API
    static void openWorkflowCoachPreferencePage() {
        var displayedIds = NodeRecommendationManager.getNodeTripleProviderFactories().stream()//
            .map(NodeTripleProviderFactory::getPreferencePageID)//
            .filter(Objects::nonNull) //
            .filter(Predicate.not(String::isBlank))//
            .toArray(String[]::new);
        var dialog =
            PreferencesUtil.createPreferenceDialogOn(null, PreferencePageIds.WORKFLOW_COACH, displayedIds, null);
        dialog.open();

        // Since changing the node recommendation settings changes the application state
        DesktopAPI.getDeps(AppStateUpdater.class).updateAppState();
    }

    /**
     * Function to allow the Web UI to switch back to the classic KNIME perspective.
     */
    @API
    static void switchToJavaUI() {
        final var projectIds = ProjectManager.getInstance().getProjectIds();
        final var doProcced = PerspectiveUtil.showDialogCloseAllProjectsOnSwitch(() -> !projectIds.isEmpty());
        if (!doProcced) {
            return; // Skips perspective switch
        }

        // All the open workflow projects will be closed on perspective switch
        final var saveAndCloseState = SaveAndCloseProjects.saveAndCloseProjectsInteractively( //
            projectIds, //
            DesktopAPI.getDeps(EventConsumer.class), //
            PostProjectCloseAction.SWITCH_PERSPECTIVE //
        );
        if (saveAndCloseState != SaveAndCloseProjects.State.SUCCESS) {
            // The 'PostProjectCloseAction.SWITCH_PERSPECTIVE' for the executed
            // 'SaveAndCloseProjects.saveAndCloseProjectsInteractively(...)' function might (surprisingly) also trigger
            // a call to 'doSwitchToJavaUI()'.
            return;
        }

        PerspectiveUtil.switchToJavaUI();
    }

    /**
     * Function that opens the dialog to switch workspace.
     */
    @API
    static void switchWorkspace() { // NOSONAR
        IWorkbenchWindow window = PlatformUI.getWorkbench().getActiveWorkbenchWindow();
        new OpenWorkspaceAction(window).run();
    }

    /**
     * Opens the given url in the external browser.
     */
    @API
    static void openUrlInExternalBrowser(final String url) {
        WebUIUtil.openURLInExternalBrowserAndAddToDebugLog(url, EclipseUIAPI.class);
    }

    /**
     * Opens the permissions dialog on KNIME Server items only.
     *
     * @param spaceProviderId
     * @param spaceId
     * @param itemId
     * @throws IOException Thrown if there was an error fetching the space item.
     */
    @API
    static void openPermissionsDialog(final String spaceProviderId, final String spaceId, final String itemId)
        throws IOException {
        final var space = SpaceProviders.getSpace(DesktopAPI.getDeps(SpaceProviders.class), spaceProviderId, spaceId);
        space.openPermissionsDialogForItem(itemId); // Method call might throw a `NotImplementedException` exception.
    }

    /**
     * Opens the folder containing the log file etc.
     */
    @API
    static void openKNIMEHomeDir() {
        final var homeDir = KNIMEConstants.getKNIMEHomeDir();
        if (Program.launch(homeDir)) {
            LOGGER.info("Opening KNIME log folder with file explorer");
        } else {
            LOGGER.error("Failed to open the file explorer on the folder containing the KNIME log. The directory is: "
                + homeDir);
        }
    }

}
