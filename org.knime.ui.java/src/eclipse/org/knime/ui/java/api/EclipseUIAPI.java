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

import java.util.Arrays;
import java.util.List;
import java.util.function.Predicate;

import org.eclipse.ui.IWorkbench;
import org.eclipse.ui.IWorkbenchWindow;
import org.eclipse.ui.PlatformUI;
import org.eclipse.ui.WorkbenchException;
import org.eclipse.ui.actions.ActionFactory;
import org.eclipse.ui.dialogs.PreferencesUtil;
import org.knime.core.ui.workflowcoach.NodeRecommendationManager;
import org.knime.core.ui.workflowcoach.data.NodeTripleProviderFactory;
import org.knime.core.webui.WebUIUtil;
import org.knime.gateway.impl.project.WorkflowProjectManager;
import org.knime.gateway.impl.service.util.EventConsumer;
import org.knime.gateway.impl.webui.AppStateUpdater;
import org.knime.ui.java.PerspectiveSwitchAddon;
import org.knime.ui.java.api.SaveAndCloseWorkflows.PostWorkflowCloseAction;
import org.knime.ui.java.util.PerspectiveUtil;
import org.knime.workbench.ui.p2.actions.InvokeInstallSiteAction;
import org.knime.workbench.ui.p2.actions.InvokeUpdateAction;

/**
 * Functions opening Eclipse-UI elements.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
final class EclipseUIAPI {

    private static final String WORKFLOW_COACH_PREFERENCE_PAGE_ID = "org.knime.workbench.workflowcoach";

    private static final String WEB_UI_PREFERENCE_PAGE_ID = "org.knime.ui.java.prefs.KnimeUIPreferencePage";

    private static final String ECLIPSE_GENERAL_PREFERENCE_PAGE_ID = "org.eclipse.ui.preferencePages.Workbench";

    private static final String ECLIPSE_APPEARANCE_PREFERENCE_PAGE_ID = "org.eclipse.ui.preferencePages.Views";

    private static final String ECLIPSE_KEYS_PREFERENCE_PAGE_ID = "org.eclipse.ui.preferencePages.Keys";

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
        var dialog = PreferencesUtil.createPreferenceDialogOn(null, WEB_UI_PREFERENCE_PAGE_ID, null, null);
        var idsToExclude = List.of(ECLIPSE_APPEARANCE_PREFERENCE_PAGE_ID, ECLIPSE_KEYS_PREFERENCE_PAGE_ID);

        Arrays.stream(dialog.getPreferenceManager().getRootSubNodes())//
            .filter(pref -> pref.getId().equals(ECLIPSE_GENERAL_PREFERENCE_PAGE_ID))//
            .findFirst()//
            .ifPresentOrElse(parent -> {
                var excluded = Arrays.stream(parent.getSubNodes())//
                    .filter(pref -> idsToExclude.contains(pref.getId()))//
                    .toList();
                // If the preference pages for the IDs to exclude were found, exclude them
                excluded.forEach(parent::remove);
                // Open the dialog
                dialog.open();
                // Include them again to make them available in Classic UI
                excluded.forEach(parent::add);
            }, dialog::open); // Just open the dialog of the pages where not found

        // Since changing the web-ui settings changes the application state
        DesktopAPI.getDeps(AppStateUpdater.class).updateAppState();
    }

    /**
     * Browser function opening the workflow coach preference pages
     */
    @API
    static void openWorkflowCoachPreferencePage() {
        var displayedIds = NodeRecommendationManager.getNodeTripleProviderFactories().stream()//
            .map(NodeTripleProviderFactory::getPreferencePageID)//
            .filter(Predicate.not(String::isBlank))//
            .toArray(String[]::new);
        var dialog =
            PreferencesUtil.createPreferenceDialogOn(null, WORKFLOW_COACH_PREFERENCE_PAGE_ID, displayedIds, null);
        dialog.open();

        // Since changing the node recommendation settings changes the application state
        DesktopAPI.getDeps(AppStateUpdater.class).updateAppState();
    }

    /**
     * Function to allow the js webapp to switch back to the classic KNIME perspective.
     */
    @API
    static void switchToJavaUI() { // NOSONAR
        if (!PerspectiveUtil.isClassicPerspectiveLoaded()) {
            // NOTE: if no classic UI has been loaded, yet,
            // all the open workflow projects will be closed on perspective switch
            var proceed = SaveAndCloseWorkflows.saveAndCloseWorkflowsInteractively(
                WorkflowProjectManager.getInstance().getWorkflowProjectsIds(), DesktopAPI.getDeps(EventConsumer.class),
                PostWorkflowCloseAction.SWITCH_PERSPECTIVE) == 1;
            if (!proceed) {
                return;
            }
        }

        doSwitchToJavaUI();
    }

    static void doSwitchToJavaUI() {
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
    }

    /**
     * Opens the given url in the external browser.
     */
    @API
    static void openUrlInExternalBrowser(final String url) {
        WebUIUtil.openURLInExternalBrowserAndAddToDebugLog(url, EclipseUIAPI.class);
    }

}
