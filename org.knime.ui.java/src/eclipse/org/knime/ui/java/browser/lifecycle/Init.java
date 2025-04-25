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
 */
package org.knime.ui.java.browser.lifecycle;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.BiConsumer;
import java.util.function.Consumer;
import java.util.function.Predicate;
import java.util.function.Supplier;

import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.core.runtime.jobs.IJobChangeListener;
import org.eclipse.core.runtime.jobs.Job;
import org.eclipse.ui.internal.progress.ProgressManager;
import org.knime.core.node.NodeFactory;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.extension.ConfigurableNodeFactoryMapper;
import org.knime.core.node.extension.NodeSpecCollectionProvider;
import org.knime.core.ui.workflowcoach.NodeRecommendationManager;
import org.knime.core.util.auth.CouldNotAuthorizeException;
import org.knime.gateway.api.webui.entity.ShowToastEventEnt;
import org.knime.gateway.api.webui.entity.SpaceProviderEnt.TypeEnum;
import org.knime.gateway.impl.jsonrpc.JsonRpcRequestHandler;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.gateway.impl.webui.AppStateUpdater;
import org.knime.gateway.impl.webui.NodeFactoryProvider;
import org.knime.gateway.impl.webui.PreferencesProvider;
import org.knime.gateway.impl.webui.ToastService;
import org.knime.gateway.impl.webui.UpdateStateProvider;
import org.knime.gateway.impl.webui.WorkflowMiddleware;
import org.knime.gateway.impl.webui.jsonrpc.DefaultJsonRpcRequestHandler;
import org.knime.gateway.impl.webui.kai.CodeKaiHandler;
import org.knime.gateway.impl.webui.kai.KaiHandler;
import org.knime.gateway.impl.webui.kai.KaiHandlerFactory.AuthTokenProvider;
import org.knime.gateway.impl.webui.kai.KaiHandlerFactoryRegistry;
import org.knime.gateway.impl.webui.modes.WebUIMode;
import org.knime.gateway.impl.webui.repo.NodeCategoryExtensions;
import org.knime.gateway.impl.webui.repo.NodeCollections;
import org.knime.gateway.impl.webui.repo.NodeRepository;
import org.knime.gateway.impl.webui.service.ServiceDependencies;
import org.knime.gateway.impl.webui.service.events.EventConsumer;
import org.knime.gateway.impl.webui.service.events.SelectionEventBus;
import org.knime.gateway.impl.webui.spaces.SpaceProvider;
import org.knime.gateway.impl.webui.spaces.SpaceProvidersManager;
import org.knime.gateway.impl.webui.spaces.SpaceProvidersManager.Key;
import org.knime.gateway.impl.webui.spaces.local.LocalSpace;
import org.knime.gateway.impl.webui.spaces.local.LocalSpaceProvider;
import org.knime.gateway.json.util.ObjectMapperUtil;
import org.knime.js.cef.CEFPlugin;
import org.knime.js.cef.commservice.CEFCommService;
import org.knime.js.cef.nodeview.CEFNodeView;
import org.knime.js.cef.wizardnodeview.CEFWizardNodeView;
import org.knime.ui.java.api.DesktopAPI;
import org.knime.ui.java.api.SaveAndCloseProjects;
import org.knime.ui.java.browser.KnimeBrowserView;
import org.knime.ui.java.persistence.AppStatePersistor;
import org.knime.ui.java.prefs.KnimeUIPreferences;
import org.knime.ui.java.util.CreateProject;
import org.knime.ui.java.util.DesktopAPUtil;
import org.knime.ui.java.util.ExampleProjects;
import org.knime.ui.java.util.MostRecentlyUsedProjects;
import org.knime.ui.java.util.NodeCollectionUtil;
import org.knime.ui.java.util.ProgressReporter;

import com.equo.middleware.api.handler.IRequestFilter;
import com.equo.middleware.api.resource.MutableRequest;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * The 'init' lifecycle state transition for the KNIME-UI. Called after {@link Create} and when the view is being
 * re-initializated after a {@link Suspend}.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 * @author Kai Franze, KNIME GmbH, Germany
 */
final class Init {

    private Init() {
        //
    }

    static LifeCycleStateInternal run(final LifeCycleStateInternal state, final boolean checkForUpdates) {
        var progressReporter = new ProgressReporter.WorkbenchProgressReporter();
        var localSpace = state.getLocalSpace();
        var eventConsumer = createEventConsumer();
        var toastService = new ToastService(eventConsumer);
        var spaceProvidersManager = createSpaceProvidersManager(localSpace, toastService);

        ProjectManager projectManager;
        if (state.getProjectManager() != null) {
            projectManager = state.getProjectManager();
        } else {
            // NOSONAR TODO NXT-3607: explicitly create new instance of ProjectManager here
            projectManager = ProjectManager.getInstance();
            state.loadedApplicationState().openProjectsToRestore().forEach(projectToRestore -> {
                var project = CreateProject.createProjectFromOrigin(projectToRestore.origin(), progressReporter, //
                        spaceProvidersManager.getSpaceProviders(SpaceProvidersManager.Key.defaultKey()) //
                );
                projectManager.addProject(project);
                if (projectToRestore.isActive()) {
                    projectManager.setProjectActive(project.getID());
                }
            });
        }

        var workflowMiddleware = new WorkflowMiddleware(projectManager, spaceProvidersManager);
        var appStateUpdater = new AppStateUpdater();
        var updateStateProvider = checkForUpdates ? new UpdateStateProvider(DesktopAPUtil::checkForUpdate) : null;
        var kaiAuthTokenProvider = createKaiAuthTokenProvider(spaceProvidersManager);
        var kaiHandler = createKaiHandler(eventConsumer, kaiAuthTokenProvider, appStateUpdater);
        var codeKaiHandler = createCodeKaiHandler(kaiAuthTokenProvider);
        var preferenceProvider = createPreferencesProvider();
        var nodeCollections = new NodeCollections(preferenceProvider, WebUIMode.getMode());
        var nodeRepository = createNodeRepository(nodeCollections);
        var selectionEventBus = createSelectionEventBus(eventConsumer);
        NodeCategoryExtensions nodeCategoryExtensions =
            () -> NodeSpecCollectionProvider.getInstance().getCategoryExtensions();

        MostRecentlyUsedProjects mostRecentlyUsedProjects;
        if (state.mostRecentlyUsedProjects() != null) {
            mostRecentlyUsedProjects = state.mostRecentlyUsedProjects();
        } else {
            mostRecentlyUsedProjects = new MostRecentlyUsedProjects(localSpace);
            state.loadedApplicationState().recentlyUsedProjects().forEach(mostRecentlyUsedProjects::add);
        }

        // "Inject" the service dependencies
        ServiceDependencies.setDefaultServiceDependencies( //
            projectManager, //
            workflowMiddleware, //
            appStateUpdater, //
            eventConsumer, //
            spaceProvidersManager, //
            updateStateProvider, //
            nodeRepository, //
            preferenceProvider, //
            createNodeFactoryProvider(), //
            kaiHandler, //
            codeKaiHandler, //
            nodeCollections, //

            nodeCategoryExtensions, //
            selectionEventBus);
        DesktopAPI.injectDependencies( //
            projectManager, //
            workflowMiddleware, //
            appStateUpdater, //
            eventConsumer, //
            spaceProvidersManager, //
            updateStateProvider, //
            nodeRepository, //
            state.getMostRecentlyUsedProjects(), //
            toastService, //
            localSpace, //
            state.getWelcomeApEndpoint(), //
            createExampleProjects(), //
            state.getUserProfile(), //
            progressReporter //
        );

        // Register listeners
        var softwareUpdateProgressListener = registerSoftwareUpdateProgressListener(eventConsumer);
        registerPreferenceListeners(appStateUpdater, spaceProvidersManager, nodeCollections, nodeRepository);

        return new LifeCycleStateInternalAdapter(state) { // NOSONAR

            @Override
            public Supplier<SaveAndCloseProjects.State> getSaveAndCloseAllProjectsFunction() {
                return () -> {
                    var projectIds = projectManager.getProjectIds();
                    return SaveAndCloseProjects.saveAndCloseProjectsInteractively(projectIds, eventConsumer);
                };
            }

            @Override
            public IJobChangeListener getJobChangeListener() {
                return softwareUpdateProgressListener;
            }

            @Override
            public ProjectManager getProjectManager() {
                return projectManager;
            }

            @Override
            public MostRecentlyUsedProjects mostRecentlyUsedProjects() {
                return mostRecentlyUsedProjects;
            }

            @Override
            public AppStatePersistor.LoadedApplicationState loadedApplicationState() {
                return AppStatePersistor.LoadedApplicationState.empty();
            }
        };

    }

    private static SelectionEventBus createSelectionEventBus(final EventConsumer eventConsumer) {
        var selectionEventBus = new SelectionEventBus();
        selectionEventBus.addSelectionEventListener(e -> eventConsumer.accept("SelectionEvent", e));
        CEFNodeView.setSelectionEventBus(selectionEventBus);
        CEFWizardNodeView.setSelectionEventBus(selectionEventBus);
        return selectionEventBus;
    }

    private static void registerPreferenceListeners(final AppStateUpdater appStateUpdater,
        final SpaceProvidersManager spaceProvidersManager, final NodeCollections nodeCollections,
        final NodeRepository nodeRepo) {
        // Update the app state when the node repository filter changes
        KnimeUIPreferences.setSelectedNodeCollectionChangeListener((oldValue, newValue) -> {
            if (!Objects.equals(oldValue, newValue)) {
                // Reset the node repository such that it uses the newly configured collection
                var activeCollection = //
                    Optional.ofNullable(nodeCollections) //
                        .flatMap(NodeCollections::getActiveCollection) //
                        .map(NodeCollections.NodeCollection::nodeFilter);
                nodeRepo.resetFilter(activeCollection.orElse(null));
                appStateUpdater.updateAppState();
            }
        });

        // Update the app state when the mouse wheel action changes
        KnimeUIPreferences.setMouseWheelActionChangeListener((oldValue, newValue) -> {
            if (!Objects.equals(oldValue, newValue)) {
                appStateUpdater.updateAppState();
            }
        });

        KnimeUIPreferences.setConfirmNodeConfigChangesPrefChangeListener(appStateUpdater::updateAppState);
        KnimeUIPreferences.setExplorerMointPointChangeListener(() -> {
            spaceProvidersManager.update();
            appStateUpdater.updateAppState();
        });

        KnimeUIPreferences.setNodeDialogModeChangeListener((oldValue, newValue) -> {
            if (!Objects.equals(oldValue, newValue)) {
                appStateUpdater.updateAppState();
            }
        });
    }

    private static NodeRepository createNodeRepository(final NodeCollections nodeCollections) {
        var activeCollection = //
            Optional.ofNullable(nodeCollections) //
                .flatMap(NodeCollections::getActiveCollection) //
                .map(NodeCollections.NodeCollection::nodeFilter);
        return new NodeRepository(activeCollection.orElse(null));
    }

    /**
     * Initializes the Java-Browser communication.
     *
     * @return a new event consumer instance forwarding events to java-script
     */
    private static EventConsumer createEventConsumer() {
        JsonRpcRequestHandler jsonRpcHandler = new DefaultJsonRpcRequestHandler();
        CEFCommService.invoke(cs -> cs.on(SharedConstants.JSON_RPC_ACTION_ID, message -> { // NOSONAR
            return new String(jsonRpcHandler.handle(message.getBytes(StandardCharsets.UTF_8)), StandardCharsets.UTF_8);
        }));

        var mapper = ObjectMapperUtil.getInstance().getObjectMapper();
        return (name, event) -> {
            var message = createEventMessage(mapper, name, event);
            CEFCommService.invoke(cs -> cs.send(SharedConstants.EVENT_ACTION_ID, message));
        };
    }

    private static String createEventMessage(final ObjectMapper mapper, final String name, final Object payload) {
        var event = mapper.createObjectNode();
        try {
            return mapper.writeValueAsString(event.put("eventType", name).set("payload", mapper.valueToTree(payload)));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Problem creating the event-message in order to send an event", ex);
        }
    }

    private static SpaceProvidersManager createSpaceProvidersManager(final LocalSpace localSpace,
        final ToastService toastService) {
        Consumer<String> loginErrorHandler = loginErrorMessage -> toastService
            .showToast(ShowToastEventEnt.TypeEnum.ERROR, "Login failed", loginErrorMessage, false);
        var spaceProvidersManager = new SpaceProvidersManager(loginErrorHandler, Init::addRequestFilterForSpaceProvider,
            Init::removeRequestFilterForSpaceProvider, new LocalSpaceProvider(localSpace));
        spaceProvidersManager.update();
        return spaceProvidersManager;
    }

    private static PreferencesProvider createPreferencesProvider() {
        return new PreferencesProvider() { // NOSONAR

            @Override
            public Predicate<String> activeNodeCollection() {
                return NodeCollectionUtil.getActiveNodeCollection();
            }

            @Override
            public boolean isScrollToZoomEnabled() {
                return KnimeUIPreferences.MOUSE_WHEEL_ACTION_ZOOM.equals(KnimeUIPreferences.getMouseWheelAction());
            }

            @Override
            public boolean hasNodeRecommendationsEnabled() {
                return NodeRecommendationManager.isEnabled();
            }

            @Override
            public boolean confirmNodeConfigChanges() {
                return KnimeUIPreferences.confirmNodeConfigChanges();
            }

            @Override
            public boolean useEmbeddedDialogs() {
                return KnimeUIPreferences.NODE_DIALOG_MODE_EMBEDDED.equals(KnimeUIPreferences.getNodeDialogMode());
            }

        };
    }

    private static ExampleProjects createExampleProjects() {
        return () -> List.of( //
            "Example Workflows/Basic Examples/Combine Clean and Summarize Spreadsheet Data", //
            "Example Workflows/Basic Examples/CountIf and SumIf", //
            "Example Workflows/Basic Examples/Non-standard format Spreadsheets" //
        );
    }

    private static NodeFactoryProvider createNodeFactoryProvider() {
        var fileExtensionToNodeFactoryMap = ConfigurableNodeFactoryMapper.getAllNodeFactoriesForFileExtensions();
        return new NodeFactoryProvider() {
            @Override
            public Class<? extends NodeFactory<?>> fromFileExtension(final String filename) {
                return ConfigurableNodeFactoryMapper.getNodeFactory(filename);
            }

            @Override
            public Map<String, String> getFileExtensionToNodeFactoryMap() {
                return fileExtensionToNodeFactoryMap;
            }
        };
    }

    /**
     * Registers a job change listener to the {@code IJobManager} to be able to track Eclipse background jobs.
     *
     * @param eventConsumer The event consumer used to send events
     * @return The job change listener that was registered
     */
    private static IJobChangeListener registerSoftwareUpdateProgressListener(final EventConsumer eventConsumer) {
        // Those three function are passed in on creation to make the class unit-testable
        Predicate<Job> isWatchedJob = job -> SoftwareUpdateProgressEventListener.WATCHED_JOBS.stream()
            .anyMatch(c -> job.getClass().getName().equals(c));
        BiConsumer<Job, IProgressMonitor> addProgressListener =
            (job, listener) -> ProgressManager.getInstance().progressFor(job).addProgressListener(listener);
        BiConsumer<Job, IProgressMonitor> removeProgressListener =
            (job, listener) -> ProgressManager.getInstance().progressFor(job).removeProgresListener(listener);
        var listener = new SoftwareUpdateProgressEventListener(eventConsumer, isWatchedJob, addProgressListener,
            removeProgressListener);
        Job.getJobManager().addJobChangeListener(listener);
        return listener;
    }

    private static AuthTokenProvider createKaiAuthTokenProvider(final SpaceProvidersManager spaceProviders) {
        return (projectId, hubId) -> {
            var spaceProvider = getSpaceProviderOrThrow(spaceProviders, hubId);
            var connection = spaceProvider.getConnection(false).orElseThrow(
                () -> new CouldNotAuthorizeException("Could not authorize. Please log into %s.".formatted(hubId)));
            return connection.getAuthorization();
        };
    }

    /**
     * @return A new K-AI handler instance or {@code null} if K-AI is not installed
     */
    private static KaiHandler createKaiHandler(final EventConsumer eventConsumer,
        final AuthTokenProvider authTokenProvider, final AppStateUpdater appStateUpdater) {
        var kaiHandler = KaiHandlerFactoryRegistry.createKaiHandler(eventConsumer, authTokenProvider)//
            .orElse(null); // null if K-AI is not installed
        if (kaiHandler != null) {
            kaiHandler.addIsKaiEnabledStateChangeListener(state -> appStateUpdater.updateAppState());
        }
        return kaiHandler;
    }

    /**
     * @return A new code generation K-AI handler instance or {@code null} if K-AI is not installed
     */
    private static CodeKaiHandler createCodeKaiHandler(final AuthTokenProvider authTokenProvider) {
        return KaiHandlerFactoryRegistry.createCodeKaiHandler(authTokenProvider).orElse(null);
    }

    /**
     * @return The space provider for the given Hub ID
     * @throws CouldNotAuthorizeException If the space provider could not be found or is not a Hub
     */
    private static SpaceProvider getSpaceProviderOrThrow(final SpaceProvidersManager spaceProvidersManager,
        final String hubId) throws CouldNotAuthorizeException {
        var spaceProvider =
            Optional.ofNullable(spaceProvidersManager.getSpaceProviders(Key.defaultKey()).getSpaceProvider(hubId))
                .orElseThrow(() -> new CouldNotAuthorizeException(
                    "Please add the %s to your hosted mountpoints and login to use K-AI.".formatted(hubId)));
        if (spaceProvider.getType() != TypeEnum.HUB) {
            throw new CouldNotAuthorizeException("Unexpected content provider for mount ID '%s'.".formatted(hubId));
        }
        return spaceProvider;
    }

    /**
     * Enables the FE to send authorized requests to a certain Hub space provider.
     */
    private static void addRequestFilterForSpaceProvider(final SpaceProvider spaceProvider) {
        if (spaceProvider.getType() != TypeEnum.HUB) {
            return;
        }

        var origin = KnimeBrowserView.getDevURL().orElse(KnimeBrowserView.BASE_URL);
        IRequestFilter requestFilter = mutableRequest -> {
            if (!mutableRequest.getFrame().isMain() || !mutableRequest.getFrame().getCurrentUrl().startsWith(origin)) {
                return;
            }

            authorizeSpaceProviderRequest(mutableRequest, spaceProvider);
        };

        var middleware = CEFPlugin.getMiddlewareService();
        spaceProvider.getServerAddress() //
            .map(URI::create) //
            .ifPresent(uri -> middleware.addRequestFilter(uri.getScheme(), uri.getHost(), requestFilter));
    }

    private static void authorizeSpaceProviderRequest(final MutableRequest mutableRequest,
        final SpaceProvider spaceProvider) {

        spaceProvider.getConnection(false) //
            .ifPresent(connection -> {
                try {
                    mutableRequest.getHeaderMap().put("Authorization", connection.getAuthorization());
                    mutableRequest.getHeaderMap().replace("Origin", spaceProvider.getServerAddress().orElseThrow());
                } catch (CouldNotAuthorizeException e) {
                    NodeLogger.getLogger(Init.class).error("Could not authorize request.", e);
                }
            });
    }

    /**
     * Disables the FE to send authorized requests to a certain Hub space provider.
     */
    private static void removeRequestFilterForSpaceProvider(final SpaceProvider spaceProvider) {
        if (spaceProvider.getType() != TypeEnum.HUB) {
            return;
        }

        var middleware = CEFPlugin.getMiddlewareService();
        spaceProvider.getServerAddress() //
            .map(URI::create) //
            .ifPresent(uri -> middleware.removeRequestFilter(uri.getScheme(), uri.getHost()));
    }

}
