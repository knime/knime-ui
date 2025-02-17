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
 */
package org.knime.ui.java.util;

import java.util.Objects;
import java.util.Optional;
import java.util.function.BooleanSupplier;

import org.eclipse.e4.ui.model.application.MApplication;
import org.eclipse.e4.ui.model.application.ui.advanced.MPerspective;
import org.eclipse.e4.ui.workbench.modeling.EModelService;
import org.eclipse.e4.ui.workbench.modeling.EPartService;
import org.eclipse.jface.dialogs.MessageDialogWithToggle;
import org.eclipse.ui.IWorkbench;
import org.eclipse.ui.IWorkbenchWindow;
import org.eclipse.ui.PlatformUI;
import org.eclipse.ui.WorkbenchException;
import org.eclipse.ui.keys.IBindingService;
import org.knime.core.ui.util.SWTUtilities;
import org.knime.ui.java.PerspectiveSwitchAddon;
import org.knime.ui.java.prefs.KnimeUIPreferences;
import org.knime.workbench.explorer.ExplorerMountTable;
import org.knime.workbench.explorer.localworkspace.LocalWorkspaceContentProvider;
import org.knime.workbench.explorer.view.AbstractContentProvider;
import org.knime.workbench.explorer.view.actions.GlobalRefreshAction;

/**
 * Utility methods and constants to manage switching between Web UI and classic perspectives.
 *
 * @author Benjamin Moser, KNIME GmbH, Konstanz, Germany
 * @author Kai Franze, KNIME GmbH
 */
public final class PerspectiveUtil {

    private PerspectiveUtil() {
        // utility class
    }

    /**
     * System property that signals the currently active perspective.
     */
    public static final String PERSPECTIVE_SYSTEM_PROPERTY = "perspective";

    /**
     * The Web UI perspective.
     */
    public static final String WEB_UI_PERSPECTIVE_ID = "org.knime.ui.java.perspective";

    /**
     * The main perspective of the classic AP UI.
     */
    public static final String CLASSIC_PERSPECTIVE_ID = "org.knime.workbench.ui.ModellerPerspective";

    /**
     * The view part in the Web UI perspective that displays the Web UI.
     */
    public static final String BROWSER_VIEW_PART_ID = "org.knime.ui.java.browser.view";

    /**
     * A shared {@link org.eclipse.e4.ui.model.application.ui.advanced.MArea} that is among the Window's sharedElements.
     * Used for sharing editors across different perspectives.
     */
    public static final String SHARED_EDITOR_AREA_ID = "org.eclipse.ui.editorss";

    /**
     * To find the {@link LocalWorkspaceContentProvider} within the list of mounted content providers
     */
    private static final String LOCAL_CONTENT_PROVIDER_ID = "LOCAL";

    private static Boolean isClassicPerspectiveLoaded;

    private static Boolean isClassicPerspectiveActive;

    /**
     * @return {@code true} if the classic perspective has been loaded (i.e. the user switched from there to the Modern
     *         UI at least once)
     */
    public static boolean isClassicPerspectiveLoaded() {
        return Objects.requireNonNullElseGet(isClassicPerspectiveLoaded, PerspectiveUtil::isClassicPerspectiveActive);
    }

    /**
     * @return {@code true} if the classic perspective is currently active
     */
    public static boolean isClassicPerspectiveActive() {
        if (isClassicPerspectiveActive == null) {
            return CLASSIC_PERSPECTIVE_ID.equals(System.getProperty(PERSPECTIVE_SYSTEM_PROPERTY));
        }
        return isClassicPerspectiveActive;
    }

    /**
     * Marks the classic perspective as currently active.
     *
     * @param isActive
     */
    public static void setClassicPerspectiveActive(final boolean isActive) {
        isClassicPerspectiveActive = isActive;
        if (isActive) {
            isClassicPerspectiveLoaded = true;
            System.setProperty(PERSPECTIVE_SYSTEM_PROPERTY, CLASSIC_PERSPECTIVE_ID);
        } else {
            System.setProperty(PERSPECTIVE_SYSTEM_PROPERTY, WEB_UI_PERSPECTIVE_ID);
        }
    }

    /**
     * Marks the classic perspective as being loaded at least once (does not mean it's active).
     */
    public static void setClassicPerspectiveLoaded() {
        isClassicPerspectiveLoaded = true;
    }

    /**
     * Obtain the Web UI perspective
     *
     * @param app The application model
     * @param modelService The model service
     * @return The Web Ui perspective
     */
    public static MPerspective getWebUIPerspective(final MApplication app, final EModelService modelService) {
        MPerspective p = (MPerspective)modelService.find(WEB_UI_PERSPECTIVE_ID, app);
        if (p == null) {
            // the id of the perspective changes once switched (no idea why)
            // -> try the new id, too
            p = (MPerspective)modelService.find(WEB_UI_PERSPECTIVE_ID + ".<WebUI>", app);
        }
        return p;
    }

    /**
     * Performs a switch back to the classic KNIME perspective.
     */
    public static void switchToJavaUI() {
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
     * Make the given perspective visible and switch to it.
     *
     * @param p The perspective to switch to
     * @param partService The part service to use
     * @throws IllegalStateException If the given perspective is <code>null</code>
     */
    public static void switchAndMakeVisible(final MPerspective p, final EPartService partService)
        throws IllegalStateException {
        if (p != null) {
            if (!p.isVisible()) {
                p.setVisible(true);
            }
            partService.switchPerspective(p);
        } else {
            throw new IllegalStateException("No KNIME Web UI perspective registered");
        }
    }

    /**
     * Calls {@link LocalWorkspaceContentProvider#refresh()} to keep the workflow files in sync
     */
    public static void refreshLocalWorkspaceContentProvider() {
        Optional.ofNullable(ExplorerMountTable.getMountedContent().get(LOCAL_CONTENT_PROVIDER_ID))//
            .map(LocalWorkspaceContentProvider.class::cast)//
            .ifPresent(LocalWorkspaceContentProvider::refresh);
    }

    /**
     * Refreshes all remote content providers, restarting any shutdown Fetchers. Fetchers are shut down while using
     * ModernUI, but they need to periodically refresh when using Classic UI (ExplorerView).
     */
    public static void refreshRemoteContentProviders() {
        if (PlatformUI.isWorkbenchRunning()) {
            final var stores = ExplorerMountTable.getMountedContent() //
                    .values().stream() //
                    .filter(p -> p.isRemote() && p.isAuthenticated()) //
                    .map(AbstractContentProvider::getRootStore).toList();
            // jobs spawned by this action restart any "sleeping" Fetchers
            GlobalRefreshAction.run(stores);
        }
    }

    /**
     * Enable or disable all classic UI key bindings
     *
     * @param isEnableKeyBindings Whether to enable (or disable) all the key bindings
     */
    public static void toggleClassicPerspectiveKeyBindings(final boolean isEnableKeyBindings) {
        if (PlatformUI.isWorkbenchRunning()) {
            var bindingService = PlatformUI.getWorkbench().getAdapter(IBindingService.class);
            bindingService.setKeyFilterEnabled(isEnableKeyBindings);
        }
    }

    /**
     * Asks for user confirmation when closing open projects on perspective switch. The dialog will not be shown if (a)
     * the corresponding Modern UI preference says so, or (b) there are no open projects that would be closed.
     *
     * @param hasOpenProjects Provides context information on open projects
     * @return Whether to proceed with the perspective switch or not.
     */
    public static boolean showDialogCloseAllProjectsOnSwitch(final BooleanSupplier hasOpenProjects) {
        if (!KnimeUIPreferences.confirmCloseProjectsOnSwitch() || !hasOpenProjects.getAsBoolean()) {
            return true; // No dialog needs to be shown
        }

        final var parent = SWTUtilities.getActiveShell();
        final var title = "All open projects will be closed";
        final var message =
            "Switching between user interfaces will always close all open projects. Do you want to proceed?";
        final var toggleMessage = "Don’t show this warning again.";
        final var dialog =
            MessageDialogWithToggle.openYesNoQuestion(parent, title, message, toggleMessage, false, null, null);

        if (dialog.getToggleState()) {
            KnimeUIPreferences.confirmCloseProjectsOnSwitch(false); // We won't show the dialog again
        }

        final var dialogReturnCode = dialog.getReturnCode();
        return dialogReturnCode == 2; // Since '2' means 'Yes'
    }

}
