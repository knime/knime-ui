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
 *   Jan 16, 2023 (hornm): created
 */
package org.knime.ui.java.browser.lifecycle;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.BiConsumer;
import java.util.function.Consumer;

import org.eclipse.core.resources.ResourcesPlugin;
import org.eclipse.core.runtime.FileLocator;
import org.eclipse.core.runtime.Platform;
import org.eclipse.ui.IWorkbench;
import org.eclipse.ui.IWorkbenchPage;
import org.eclipse.ui.IWorkbenchWindow;
import org.eclipse.ui.PlatformUI;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.workflow.NodeTimer;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.gateway.impl.webui.spaces.local.LocalSpace;
import org.knime.js.cef.middleware.CEFMiddlewareService;
import org.knime.js.cef.middleware.CEFMiddlewareService.PageResourceHandler;
import org.knime.product.rcp.intro.WelcomeAPEndpoint;
import org.knime.ui.java.api.DesktopAPI;
import org.knime.ui.java.browser.KnimeBrowserView;
import org.knime.ui.java.persistence.AppStatePersistor;
import org.knime.ui.java.persistence.UserProfilePersistor;
import org.knime.ui.java.prefs.KnimeUIPreferences;
import org.knime.ui.java.profile.UserProfile;
import org.knime.ui.java.util.MostRecentlyUsedProjects;
import org.knime.ui.java.util.PerspectiveUtil;
import org.knime.ui.java.util.UserDirectory;
import org.knime.workbench.editor2.LoadWorkflowRunnable;
import org.knime.workbench.ui.navigator.ProjectWorkflowMap;
import org.knime.workbench.workflowcoach.NodeRecommendationUpdater;

/**
 * The 'create' lifecycle-phase for the KNIME-UI. Only called exactly once at the beginning.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
final class Create {

    private static final String BASE_PATH = "dist";

    private Create() {
        //
    }

    static LifeCycleStateInternal run(final BiConsumer<String, Consumer<Object[]>> apiFunctionCaller) {
        // In order for the mechanism to block external requests to work (see CEFPlugin-class)
        // the resource handlers must be registered before the browser initialization
        initializeResourceHandlers();
        DesktopAPI.forEachAPIFunction(apiFunctionCaller);

        if (!PerspectiveUtil.isClassicPerspectiveLoaded()) {
            assertNoOpenClassicEditors();
            // Only call endpoint for tracking when the classic perspective is not loaded
            WelcomeAPEndpoint.getInstance().callEndpointForTracking(true);
        }

        // Initialize the node timer with the currently active 'perspective'
        NodeTimer.GLOBAL_TIMER.setLastUsedPerspective(KnimeUIPreferences.getSelectedNodeCollection());

        // Initialize the workflow manager class -> mainly helps to indirectly trigger
        // `IEarlyStartup#runBeforeWFMClassLoaded()`
        WorkflowManager.ROOT.getClass();

        // Disable Classic UI key bindings to avoid conflict with Modern UI key bindings
        PerspectiveUtil.toggleClassicPerspectiveKeyBindings(false);

        // Check for node recommendation updates, non-blocking
        NodeRecommendationUpdater.checkForStatisticUpdates(false);

        LoadWorkflowRunnable.doPostLoadCheckForMetaNodeUpdates = false;

        var projectManager = ProjectManager.getInstance();
        var mostRecentlyUsedProjects = new MostRecentlyUsedProjects();
        var localSpace = createLocalSpace();
        ProjectWorkflowMap.isActive = false;
        AppStatePersistor.loadAppState(projectManager, mostRecentlyUsedProjects, localSpace);
        var userProfile = loadUserProfile();
        userProfile.internalUsage().trackUiCreated();

        return LifeCycleStateInternal.of(projectManager, mostRecentlyUsedProjects, localSpace,
            WelcomeAPEndpoint.getInstance(), userProfile);
    }

    private static UserProfile loadUserProfile() {
        var userProfilePath = UserDirectory.getProfileDirectory();
        var userProfile = userProfilePath.map(UserProfilePersistor::loadUserProfile)
            .orElseGet(UserProfilePersistor::createEmptyUserProfile);
        if (userProfilePath.isEmpty()) {
            NodeLogger.getLogger(Create.class).error("Can't read user profile. No user profile location set.");
        }
        return userProfile;
    }

    private static Optional<IWorkbench> getWorkbenchOptional() {
        try {
            return Optional.of(PlatformUI.getWorkbench());
        } catch (IllegalStateException e) {
            NodeLogger.getLogger(Create.class).warn("Can't get workbench instance.", e);
            return Optional.empty();
        }
    }

    private static void assertNoOpenClassicEditors() {
        AtomicReference<IWorkbenchPage> pageReference = new AtomicReference<>();
        getWorkbenchOptional() //
            .map(IWorkbench::getActiveWorkbenchWindow) //
            .map(IWorkbenchWindow::getActivePage) //
            .map(page -> {
                pageReference.set(page);
                return page.getEditorReferences();
            }) //
            .filter(editorReferences -> editorReferences.length > 0) //
            .ifPresent(editorReferences -> Arrays.stream(editorReferences) //
                .map(editorReference -> { // To fix NXT-3313
                    var name = editorReference.getName();
                    NodeLogger.getLogger(Create.class).error("Closing unexpectedly open editor '" + name + "'.");
                    return editorReference.getEditor(false);
                }) //
                .forEach(editor -> pageReference.get().closeEditor(editor, false)));
    }

    private static void initializeResourceHandlers() {
        CEFMiddlewareService.registerCustomResourceHandler(KnimeBrowserView.DOMAIN_NAME, url -> {
            var bundleUrl = Platform.getBundle("org.knime.ui.js").getEntry(BASE_PATH + url.getPath());
            try {
                return FileLocator.toFileURL(bundleUrl).openStream();
            } catch (Exception e) { // NOSONAR
                var message = "Problem loading UI resources at '" + url + "'. See log for details.";
                NodeLogger.getLogger(KnimeBrowserView.class).error(message, e);
                return new ByteArrayInputStream(message.getBytes(StandardCharsets.UTF_8));
            }

        }, true);

        CEFMiddlewareService.registerPageAndPageBuilderResourceHandlers( //
            PageResourceHandler.PORT_VIEW, //
            PageResourceHandler.NODE_VIEW, //
            PageResourceHandler.NODE_DIALOG, //
            PageResourceHandler.DATA_VALUE_VIEW //
        );
    }

    private static LocalSpace createLocalSpace() {
        var localWorkspaceRootPath = ResourcesPlugin.getWorkspace().getRoot().getLocation().toFile().toPath();
        return new LocalSpace(localWorkspaceRootPath);
    }

}
