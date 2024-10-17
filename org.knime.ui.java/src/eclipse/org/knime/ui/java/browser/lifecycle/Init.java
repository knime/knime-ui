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

import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Objects;
import java.util.Optional;
import java.util.function.BiConsumer;
import java.util.function.Predicate;
import java.util.function.Supplier;
import java.util.stream.Collectors;

import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.core.runtime.jobs.IJobChangeListener;
import org.eclipse.core.runtime.jobs.Job;
import org.eclipse.ui.internal.progress.ProgressManager;
import org.knime.core.node.NodeFactory;
import org.knime.core.ui.workflowcoach.NodeRecommendationManager;
import org.knime.core.util.auth.CouldNotAuthorizeException;
import org.knime.gateway.api.util.ExtPointUtil;
import org.knime.gateway.api.webui.entity.SpaceProviderEnt;
import org.knime.gateway.api.webui.entity.SpaceProviderEnt.TypeEnum;
import org.knime.gateway.impl.jsonrpc.JsonRpcRequestHandler;
import org.knime.gateway.impl.webui.AppStateUpdater;
import org.knime.gateway.impl.webui.NodeCollections;
import org.knime.gateway.impl.webui.NodeFactoryProvider;
import org.knime.gateway.impl.webui.NodeRepository;
import org.knime.gateway.impl.webui.PreferencesProvider;
import org.knime.gateway.impl.webui.ToastService;
import org.knime.gateway.impl.webui.UpdateStateProvider;
import org.knime.gateway.impl.webui.WorkflowMiddleware;
import org.knime.gateway.impl.webui.jsonrpc.DefaultJsonRpcRequestHandler;
import org.knime.gateway.impl.webui.kai.KaiHandler;
import org.knime.gateway.impl.webui.kai.KaiHandlerFactory.AuthTokenProvider;
import org.knime.gateway.impl.webui.kai.KaiHandlerFactoryRegistry;
import org.knime.gateway.impl.webui.modes.WebUIMode;
import org.knime.gateway.impl.webui.service.ServiceDependencies;
import org.knime.gateway.impl.webui.service.events.EventConsumer;
import org.knime.gateway.impl.webui.service.events.SelectionEventBus;
import org.knime.gateway.impl.webui.spaces.SpaceProvider;
import org.knime.gateway.impl.webui.spaces.SpaceProviders;
import org.knime.gateway.impl.webui.spaces.local.LocalWorkspace;
import org.knime.gateway.json.util.ObjectMapperUtil;
import org.knime.js.cef.commservice.CEFCommService;
import org.knime.js.cef.nodeview.CEFNodeView;
import org.knime.js.cef.wizardnodeview.CEFWizardNodeView;
import org.knime.ui.java.api.DesktopAPI;
import org.knime.ui.java.api.SaveAndCloseProjects;
import org.knime.ui.java.api.SaveAndCloseProjects.PostProjectCloseAction;
import org.knime.ui.java.prefs.KnimeUIPreferences;
import org.knime.ui.java.util.DesktopAPUtil;
import org.knime.ui.java.util.ExampleProjects;
import org.knime.ui.java.util.LocalSpaceUtil;
import org.knime.ui.java.util.NodeCollectionUtil;
import org.knime.ui.java.util.SpaceProvidersUtil;
import org.knime.workbench.repository.util.ConfigurableNodeFactoryMapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * The 'init' lifecycle state transition for the KNIME-UI. Called after {@link Create} and when the view is being
 * re-initializated after a {@link Suspend}.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 * @author Kai Franze, KNIME GmbH
 */
final class Init {

    private static final String SPACE_PROVIDERS_EXTENSION_ID = "org.knime.ui.java.SpaceProviders";

    private Init() {
        //
    }

    static LifeCycleStateInternal run(final LifeCycleStateInternal state, final boolean checkForUpdates) {
        // Create and set default service dependencies
        var projectManager = state.getProjectManager();
        var localSpace = state.getLocalWorkspace();
        var spaceProviders = createSpaceProviders(localSpace);
        var workflowMiddleware = new WorkflowMiddleware(projectManager, spaceProviders);
        var appStateUpdater = new AppStateUpdater();
        var eventConsumer = createEventConsumer();
        var toastService = new ToastService(eventConsumer);
        var updateStateProvider = checkForUpdates ? new UpdateStateProvider(DesktopAPUtil::checkForUpdate) : null;
        var kaiHandler = createKaiHandler(eventConsumer, spaceProviders);
        var preferenceProvider = createPreferencesProvider();
        var nodeCollections = new NodeCollections(preferenceProvider, WebUIMode.getMode());
        var nodeRepo = createNodeRepository(nodeCollections);
        var selectionEventBus = createSelectionEventBus(eventConsumer);

        ServiceDependencies.setDefaultServiceDependencies(projectManager, workflowMiddleware, appStateUpdater,
            eventConsumer, spaceProviders, updateStateProvider, preferenceProvider, createNodeFactoryProvider(),
            kaiHandler, nodeCollections, nodeRepo, selectionEventBus);

        DesktopAPI.injectDependencies(projectManager, appStateUpdater, spaceProviders, updateStateProvider,
            eventConsumer, workflowMiddleware, toastService, nodeRepo, state.getMostRecentlyUsedProjects(),
            state.getLocalWorkspace(), state.getWelcomeApEndpoint(), createExampleProjects());

        var softwareUpdateProgressListener = registerSoftwareUpdateProgressListener(eventConsumer);

        registerPreferenceListeners(appStateUpdater, spaceProviders, eventConsumer, nodeCollections, nodeRepo);

        return new LifeCycleStateInternalAdapter(state) { // NOSONAR

            @Override
            public Supplier<SaveAndCloseProjects.State> saveAndCloseAllWorkflows() {
                return () -> {
                    var projectIds = projectManager.getProjectIds();
                    return SaveAndCloseProjects.saveAndCloseProjectsInteractively(projectIds, eventConsumer,
                        PostProjectCloseAction.SHUTDOWN);
                };
            }

            @Override
            public IJobChangeListener getJobChangeListener() {
                return softwareUpdateProgressListener;
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
        final UpdatableSpaceProviders spaceProviders, final EventConsumer eventConsumer,
        final NodeCollections nodeCollections, final NodeRepository nodeRepo) {
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
            spaceProviders.update();
            SpaceProvidersUtil.sendSpaceProvidersChangedEvent(spaceProviders, eventConsumer);
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
     * @return a new event consumer instance forwarding events to java-script
     */
    private static EventConsumer createEventConsumer() {
        return initializeJavaBrowserCommunication(SharedConstants.JSON_RPC_ACTION_ID,
            SharedConstants.EVENT_ACTION_ID);
    }

    private static UpdatableSpaceProviders createSpaceProviders(final LocalWorkspace localSpace) {
        return new UpdatableSpaceProviders(localSpace);
    }

    private static PreferencesProvider createPreferencesProvider() {
        return new PreferencesProvider() {
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

    private static EventConsumer initializeJavaBrowserCommunication(final String jsonRpcActionId,
        final String eventActionId) {
        JsonRpcRequestHandler jsonRpcHandler = new DefaultJsonRpcRequestHandler();
        CEFCommService.invoke(cs -> cs.on(jsonRpcActionId, message -> { // NOSONAR
            return new String(jsonRpcHandler.handle(message.getBytes(StandardCharsets.UTF_8)), StandardCharsets.UTF_8);
        }));

        var mapper = ObjectMapperUtil.getInstance().getObjectMapper();
        return (name, event) -> {
            var message = createEventMessage(mapper, name, event);
            CEFCommService.invoke(cs -> cs.send(eventActionId, message));
        };
    }

    private static String createEventMessage(final ObjectMapper mapper, final String name,
        final Object payload) {
        var event = mapper.createObjectNode();
        try {
            return mapper.writeValueAsString(event.put("eventType", name).set("payload", mapper.valueToTree(payload)));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Problem creating the event-message in order to send an event", ex);
        }
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

    private static final class UpdatableSpaceProviders implements SpaceProviders {

        private final SpaceProvider m_localWorkspaceProvider;

        private final List<SpaceProviders> m_spaceProvidersFromExtensionPoint = getSpaceProvidersFromExtensionPoint();

        // thread-safe through synchronized access
        private Map<String, SpaceProvider> m_providers = Map.of();

        // thread-safe through synchronized access
        private Map<String, SpaceProviderEnt.TypeEnum> m_providerTypes = Map.of();

        public UpdatableSpaceProviders(final LocalWorkspace localSpace) {
            m_localWorkspaceProvider = LocalSpaceUtil.createLocalWorkspaceProvider(localSpace);
            update();
        }

        @Override
        public synchronized Map<String, SpaceProvider> getProvidersMap() {
            return m_providers;
        }

        @Override
        public synchronized Map<String, TypeEnum> getProviderTypes() {
            return m_providerTypes;
        }

        synchronized void update() {
            final var newProviders = new LinkedHashMap<String, SpaceProvider>();
            newProviders.put(m_localWorkspaceProvider.getId(), m_localWorkspaceProvider);
            m_spaceProvidersFromExtensionPoint.forEach(sp -> newProviders.putAll(sp.getProvidersMap()));
            m_providers = Collections.unmodifiableMap(newProviders);
            m_providerTypes = newProviders.entrySet().stream() //
                    .collect(Collectors.toUnmodifiableMap(Entry::getKey, e -> e.getValue().getType()));
        }

        private static List<SpaceProviders> getSpaceProvidersFromExtensionPoint() {
            return ExtPointUtil.collectExecutableExtensions(SPACE_PROVIDERS_EXTENSION_ID, "class");
        }

    }

    private static KaiHandler createKaiHandler(final EventConsumer eventConsumer, final SpaceProviders spaceProviders) {
        AuthTokenProvider authTokenProvider = (projectId, hubId) -> {
            var spaceProvider = spaceProviders.getProvidersMap().get(hubId);
            if (spaceProvider == null) {
                throw new CouldNotAuthorizeException(
                    "Please add the %s to your hosted mountpoints and login to use K-AI.".formatted(hubId));
            } else if (spaceProvider.getType() == TypeEnum.HUB) {
                var connection = spaceProvider.getConnection(false).orElse(null);
                if (connection != null) {
                    return connection.getAuthorization();
                }
                throw new CouldNotAuthorizeException("Could not authorize. Please log into %s.".formatted(hubId));
            }
            throw new CouldNotAuthorizeException("Unexpected content provider for mount ID '%s'.".formatted(hubId));
        };
        return KaiHandlerFactoryRegistry.createKaiHandler(eventConsumer, authTokenProvider)//
            .orElse(null); // null if K-AI is not installed
    }

}
