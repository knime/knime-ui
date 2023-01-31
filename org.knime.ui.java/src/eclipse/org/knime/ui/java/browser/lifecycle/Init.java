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

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Objects;
import java.util.function.IntSupplier;

import org.knime.core.ui.workflowcoach.NodeRecommendationManager;
import org.knime.gateway.api.util.ExtPointUtil;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.InvalidRequestException;
import org.knime.gateway.api.webui.util.EntityFactory;
import org.knime.gateway.impl.jsonrpc.JsonRpcRequestHandler;
import org.knime.gateway.impl.project.WorkflowProjectManager;
import org.knime.gateway.impl.service.util.EventConsumer;
import org.knime.gateway.impl.webui.AppStateUpdater;
import org.knime.gateway.impl.webui.ExampleProjects;
import org.knime.gateway.impl.webui.PreferencesProvider;
import org.knime.gateway.impl.webui.UpdateStateProvider;
import org.knime.gateway.impl.webui.jsonrpc.DefaultJsonRpcRequestHandler;
import org.knime.gateway.impl.webui.service.DefaultEventService;
import org.knime.gateway.impl.webui.spaces.LocalWorkspace;
import org.knime.gateway.impl.webui.spaces.SpaceProvider;
import org.knime.gateway.impl.webui.spaces.SpaceProviders;
import org.knime.gateway.json.util.ObjectMapperUtil;
import org.knime.ui.java.browser.KnimeBrowserView;
import org.knime.ui.java.browser.function.ClearAppForTestingBrowserFunction;
import org.knime.ui.java.browser.function.CloseWorkflowBrowserFunction;
import org.knime.ui.java.browser.function.ConnectSpaceProviderBrowserFunction;
import org.knime.ui.java.browser.function.DisconnectSpaceProviderBrowserFunction;
import org.knime.ui.java.browser.function.EmitUpdateAvailableEventForTestingBrowserFunction;
import org.knime.ui.java.browser.function.GetSpaceProvidersBrowserFunction;
import org.knime.ui.java.browser.function.ImportFilesBrowserFunction;
import org.knime.ui.java.browser.function.ImportWorkflowsBrowserFunction;
import org.knime.ui.java.browser.function.InitAppForTestingBrowserFunction;
import org.knime.ui.java.browser.function.OpenAboutDialogBrowserFunction;
import org.knime.ui.java.browser.function.OpenInstallExtensionsDialogBrowserFunction;
import org.knime.ui.java.browser.function.OpenLayoutEditorBrowserFunction;
import org.knime.ui.java.browser.function.OpenLegacyFlowVariableDialogBrowserFunction;
import org.knime.ui.java.browser.function.OpenNodeDialogBrowserFunction;
import org.knime.ui.java.browser.function.OpenNodeViewBrowserFunction;
import org.knime.ui.java.browser.function.OpenUpdateDialogBrowserFunction;
import org.knime.ui.java.browser.function.OpenWorkflowBrowserFunction;
import org.knime.ui.java.browser.function.OpenWorkflowCoachPreferencePageBrowserFunction;
import org.knime.ui.java.browser.function.SaveAndCloseWorkflowsBrowserFunction;
import org.knime.ui.java.browser.function.SaveAndCloseWorkflowsBrowserFunction.PostWorkflowCloseAction;
import org.knime.ui.java.browser.function.SaveWorkflowBrowserFunction;
import org.knime.ui.java.browser.function.SetProjectActiveAndEnsureItsLoadedBrowserFunction;
import org.knime.ui.java.browser.function.SwitchToJavaUIBrowserFunction;
import org.knime.ui.java.prefs.KnimeUIPreferences;
import org.knime.ui.java.util.DefaultServicesUtil;
import org.knime.ui.java.util.DesktopAPUtil;
import org.knime.ui.java.util.LocalSpaceUtil;

import com.equo.chromium.swt.Browser;
import com.equo.chromium.swt.BrowserFunction;
import com.equo.comm.api.CommServiceProvider;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * The 'init' lifecycle state transition for the KNIME-UI. Called after {@link Create} and when the view is being
 * re-initializated after a {@link Suspend}.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
final class Init {

    private static final String SPACE_PROVIDERS_EXTENSION_ID = "org.knime.ui.java.SpaceProviders";

    private Init() {
        //
    }

    static LifeCycleStateInternal run(final Browser browser, final boolean checkForUpdates) {

        // Create and set default service dependencies
        var eventConsumer = createEventConsumer();
        var appStateUpdater = new AppStateUpdater();
        var updateStateProvider = checkForUpdates ? new UpdateStateProvider(DesktopAPUtil::checkForUpdate) : null;
        var spaceProviders = createSpaceProviders();
        DefaultServicesUtil.setDefaultServiceDependencies(appStateUpdater, eventConsumer, spaceProviders,
            updateStateProvider, createPreferencesProvider(), createExampleProjects());

        if (updateStateProvider != null) {
            // Check for updates and notify UI
            try {
                DefaultEventService.getInstance().addEventListener(EntityFactory.UpdateState.buildEventTypeEnt());
            } catch (InvalidRequestException e) {
                KnimeBrowserView.LOGGER.error("Could not add update state changed event listener to event service", e);
            }
            updateStateProvider.checkForUpdates();
        }

        // Initialize browser functions and set CEF browser URL
        var removeAndDisposeAllBrowserFunctions =
            initBrowserFunctions(browser, appStateUpdater, spaceProviders, updateStateProvider, eventConsumer);

        // Update the app state when the node repository filter changes
        KnimeUIPreferences.setNodeRepoFilterChangeListener((oldValue, newValue) -> {
            if (!Objects.equals(oldValue, newValue)) {
                appStateUpdater.updateAppState();
            }
        });

        return new LifeCycleStateInternal() {

            @Override
            public IntSupplier saveAndCloseAllWorkflows() {
                return () -> {
                    var projectIds = WorkflowProjectManager.getInstance().getWorkflowProjectsIds();
                    return SaveAndCloseWorkflowsBrowserFunction.saveAndCloseWorkflowsInteractively(projectIds,
                        eventConsumer, PostWorkflowCloseAction.SHUTDOWN);
                };
            }

            @Override
            public Runnable removeAndDisposeAllBrowserFunctions() {
                return removeAndDisposeAllBrowserFunctions;
            }
        };

    }

    /**
     * @return a new event consumer instance forwarding events to java-script
     */
    private static EventConsumer createEventConsumer() {
        return initializeJavaBrowserCommunication(SharedConstants.JSON_RPC_ACTION_ID,
            SharedConstants.JSON_RPC_NOTIFICATION_ACTION_ID);
    }

    private static SpaceProviders createSpaceProviders() {
        var localWorkspaceProvider = LocalSpaceUtil.createLocalWorkspaceProvider();
        var spaceProvidersFromExtensionPoint = getSpaceProvidersFromExtensionPoint();
        var res = new LinkedHashMap<String, SpaceProvider>();
        res.put(localWorkspaceProvider.getId(), localWorkspaceProvider);
        spaceProvidersFromExtensionPoint.forEach(sp -> res.putAll(sp.getProvidersMap()));
        return () -> res;
    }

    private static PreferencesProvider createPreferencesProvider() {
        return new PreferencesProvider() {

            @Override
            public boolean isNodeRepoFilterEnabled() {
                return !KnimeUIPreferences.NODE_REPO_FILTER_NONE_ID.equals(KnimeUIPreferences.getNodeRepoFilter());
            }

            @Override
            public boolean hasNodeRecommendationsEnabled() {
                return NodeRecommendationManager.isEnabled();
            }
        };
    }

    private static ExampleProjects createExampleProjects() {
        return new ExampleProjects() {

            @Override
            public LocalWorkspace getLocalWorkspace() {
                return LocalSpaceUtil.getLocalWorkspace();
            }

            @Override
            public List<String> getRelativeExampleProjectPaths() {
                return List.of( //
                    "Example Workflows/Basic Examples/Building a Simple Classifier", //
                    "Example Workflows/Basic Examples/Data Blending", //
                    "Example Workflows/Basic Examples/Simple Reporting Example" //
                );
            }
        };
    }

    static List<SpaceProviders> getSpaceProvidersFromExtensionPoint() {
        return ExtPointUtil.collectExecutableExtensions(SPACE_PROVIDERS_EXTENSION_ID, "class");
    }

    private static EventConsumer initializeJavaBrowserCommunication(final String jsonRpcActionId,
        final String jsonRpcNotificationActionId) {
        var commService = CommServiceProvider.getCommService()
            .orElseThrow(() -> new IllegalStateException("No CEF communication service available!"));

        JsonRpcRequestHandler jsonRpcHandler = new DefaultJsonRpcRequestHandler();
        commService.on(jsonRpcActionId, message -> { // NOSONAR
            return new String(jsonRpcHandler.handle(message.getBytes(StandardCharsets.UTF_8)), StandardCharsets.UTF_8);
        });

        final var mapper = ObjectMapperUtil.getInstance().getObjectMapper();
        return (name, event) -> {
            var message = createJsonRpcNotification(mapper, name, event);
            commService.send(jsonRpcNotificationActionId, message);
        };
    }

    private static String createJsonRpcNotification(final ObjectMapper mapper, final String name, final Object event) {
        // wrap event into a jsonrpc notification (method == event-name) and serialize
        var jsonrpc = mapper.createObjectNode();
        var params = jsonrpc.arrayNode();
        params.addPOJO(event);
        try {
            return mapper.writeValueAsString(jsonrpc.put("jsonrpc", "2.0").put("method", name).set("params", params));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Problem creating a json-rpc notification in order to send an event", ex);
        }
    }

    /**
     * Initializes and registers the {@link BrowserFunction BrowserFunctions} with the browser.
     *
     * @param appStateUpdater Required to initialize some browser functions
     * @param spaceProviders Required to initialize some browser functions
     * @param updateStateProvider Required to initialize {@link EmitUpdateAvailableEventForTestingBrowserFunction}
     * @param eventConsumer
     * @return a runnable that removes and disposes all browser functions
     */
    private static Runnable initBrowserFunctions(final Browser browser, final AppStateUpdater appStateUpdater,
        final SpaceProviders spaceProviders, final UpdateStateProvider updateStateProvider,
        final EventConsumer eventConsumer) {
        var functions = new ArrayList<BrowserFunction>();
        functions.add(new SwitchToJavaUIBrowserFunction(browser, eventConsumer));
        functions.add(new OpenNodeViewBrowserFunction(browser));
        functions.add(new OpenNodeDialogBrowserFunction(browser));
        functions.add(new OpenLegacyFlowVariableDialogBrowserFunction(browser));
        functions.add(new SaveWorkflowBrowserFunction(browser));
        functions.add(new OpenWorkflowBrowserFunction(browser, appStateUpdater, spaceProviders));
        functions.add(new CloseWorkflowBrowserFunction(browser, appStateUpdater, eventConsumer));
        functions.add(new OpenLayoutEditorBrowserFunction(browser));
        functions.add(new OpenWorkflowCoachPreferencePageBrowserFunction(browser, appStateUpdater));
        functions.add(new OpenAboutDialogBrowserFunction(browser));
        functions.add(new OpenInstallExtensionsDialogBrowserFunction(browser));
        functions.add(new OpenUpdateDialogBrowserFunction(browser));
        functions.add(new GetSpaceProvidersBrowserFunction(browser, spaceProviders));
        functions.add(new ConnectSpaceProviderBrowserFunction(browser, spaceProviders));
        functions.add(new DisconnectSpaceProviderBrowserFunction(browser, spaceProviders));
        functions.add(new SaveAndCloseWorkflowsBrowserFunction(browser, appStateUpdater));
        functions.add(new SetProjectActiveAndEnsureItsLoadedBrowserFunction(browser));
        functions.add(new ImportFilesBrowserFunction(browser));
        functions.add(new ImportWorkflowsBrowserFunction(browser));
        if (SharedConstants.isRemoteDebuggingPortSet()) {
            functions.add(new InitAppForTestingBrowserFunction(browser));
            functions.add(new ClearAppForTestingBrowserFunction(browser));
            functions.add(new EmitUpdateAvailableEventForTestingBrowserFunction(browser, updateStateProvider));
        }
        return () -> functions.stream().forEach(fct -> fct.dispose(true));
    }

}
