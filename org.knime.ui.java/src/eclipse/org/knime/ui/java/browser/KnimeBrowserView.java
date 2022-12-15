package org.knime.ui.java.browser;

import static org.knime.ui.java.PerspectiveUtil.BROWSER_VIEW_PART_ID;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collections;
import java.util.List;
import java.util.function.Consumer;
import java.util.function.Supplier;
import java.util.stream.Collectors;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import javax.inject.Inject;

import org.eclipse.core.resources.ResourcesPlugin;
import org.eclipse.core.runtime.FileLocator;
import org.eclipse.core.runtime.Platform;
import org.eclipse.e4.core.contexts.Active;
import org.eclipse.e4.ui.di.Focus;
import org.eclipse.e4.ui.model.application.ui.basic.MPart;
import org.eclipse.swt.SWT;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Menu;
import org.knime.core.node.NodeLogger;
import org.knime.gateway.api.entity.NodeIDEnt;
import org.knime.gateway.impl.jsonrpc.JsonRpcRequestHandler;
import org.knime.gateway.impl.project.WorkflowProject;
import org.knime.gateway.impl.project.WorkflowProjectManager;
import org.knime.gateway.impl.service.util.EventConsumer;
import org.knime.gateway.impl.webui.AppStateProvider;
import org.knime.gateway.impl.webui.AppStateProvider.AppState;
import org.knime.gateway.impl.webui.LocalWorkspace;
import org.knime.gateway.impl.webui.SpaceProvider;
import org.knime.gateway.impl.webui.SpaceProviders;
import org.knime.gateway.impl.webui.jsonrpc.DefaultJsonRpcRequestHandler;
import org.knime.gateway.json.util.ObjectMapperUtil;
import org.knime.js.cef.middleware.CEFMiddlewareService;
import org.knime.js.cef.middleware.CEFMiddlewareService.PageResourceHandler;
import org.knime.ui.java.DefaultServicesUtil;
import org.knime.ui.java.browser.function.ClearAppForTestingBrowserFunction;
import org.knime.ui.java.browser.function.CloseWorkflowBrowserFunction;
import org.knime.ui.java.browser.function.CreateWorkflowBrowserFunction;
import org.knime.ui.java.browser.function.InitAppForTestingBrowserFunction;
import org.knime.ui.java.browser.function.OpenLayoutEditorBrowserFunction;
import org.knime.ui.java.browser.function.OpenLegacyFlowVariableDialogBrowserFunction;
import org.knime.ui.java.browser.function.OpenNodeDialogBrowserFunction;
import org.knime.ui.java.browser.function.OpenNodeViewBrowserFunction;
import org.knime.ui.java.browser.function.OpenWorkflowBrowserFunction;
import org.knime.ui.java.browser.function.OpenWorkflowCoachPreferencePageBrowserFunction;
import org.knime.ui.java.browser.function.SaveWorkflowBrowserFunction;
import org.knime.ui.java.browser.function.SwitchToJavaUIBrowserFunction;

import com.equo.chromium.swt.Browser;
import com.equo.chromium.swt.BrowserFunction;
import com.equo.comm.api.CommServiceProvider;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Simple view containing a browser initialized with the knime-ui webapp (or a
 * debug message if in debug mode) and the communication backend injected.
 *
 * <br/><br/>
 * For a quick intro to the e4 application model please read 'E4_Application_Model.md'.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public class KnimeBrowserView {

    static final String EMPTY_PAGE = "about:blank";

    private static final String REMOTE_DEBUGGING_PORT_PROP = "chromium.remote_debugging_port";

    private static final String DEV_URL_PROP = "org.knime.ui.dev.url";

    private static final String DOMAIN_NAME = "org.knime.ui.java";

    private static final String HTTP = "http";

    static final String BASE_URL = HTTP + "://" + DOMAIN_NAME;

    private static final String APP_PAGE = BASE_URL + "/index.html";

    private static final String BASE_PATH = "dist";

    private static final String JSON_RPC_ACTION_ID = "org.knime.ui.java.jsonrpc";

    private static final String JSON_RPC_NOTIFICATION_ACTION_ID = "org.knime.ui.java.jsonrpcNotification";

    private static KnimeBrowserView instance = null;

    private static Consumer<KnimeBrowserView> viewInitializer = null;

    private Browser m_browser;

    /**
     * Activates the view initializer that will be executed as soon as this view becomes finally visible (again). Once
     * the view initializer has been executed, it will be activated (and would need to be activated again).
     *
     * @param appStateSupplier supplies the app state for the UI
     */
    public static void activateViewInitializer(final Supplier<AppState> appStateSupplier) {
        viewInitializer = v -> v.initView(appStateSupplier, false);
    }

    /**
     * Initializes the view for testing purposes.
     *
     * @param appStateSupplier supplies the app state for the UI
     */
    public static void initViewForTesting(final Supplier<AppState> appStateSupplier) {
        if (instance == null) {
            throw new IllegalStateException("No browser view instance available");
        }
        instance.initView(appStateSupplier, true);
    }

    private void initView(final Supplier<AppState> appStateSupplier, final boolean ignoreEmptyPageAsDevUrl) {
        var eventConsumer = createEventConsumer();
        var appStateProvider = new AppStateProvider(appStateSupplier);
        DefaultServicesUtil.setDefaultServiceDependencies(appStateProvider, eventConsumer,
            createSpaceProviders());
        initBrowserFunctions(appStateProvider);
        setUrl(ignoreEmptyPageAsDevUrl);
    }

    private static SpaceProviders createSpaceProviders() {
        var localWorkspaceProvider = createLocalWorkspaceProvider();
        return () -> Collections.singletonList(localWorkspaceProvider);
    }

    private static SpaceProvider createLocalWorkspaceProvider() {
        var localWorkspaceRootPath = ResourcesPlugin.getWorkspace().getRoot().getLocation().toFile().toPath();
        var localWorkspace = new LocalWorkspace(localWorkspaceRootPath);
        return () -> Collections.singletonList(localWorkspace);
    }

    /**
     * Clears the view. Called when the view is not needed anymore (for some time), e.g. on perspective switch.
     *
     * If the view is activated/used again, it need to be initialized either via
     * {@link #activateViewInitializer(Supplier)} or {@link #initViewForTesting(Supplier)}.
     */
    public static void clearView() {
        if (instance != null) {
            instance.clearUrl();
            DefaultServicesUtil.disposeDefaultServices();
        }
    }

    @PostConstruct
    public void createPartControl(final Composite parent) {
        // This is a 'quasi' singleton. Even though it has a public constructor it's only expected to have one single
        // instance and will fail if this method is called on another instance again.
        if (instance != null) {
            throw new IllegalStateException(
                "Instance can't be created. There's only one instance of the KnimeBrowserView allowed.");
        }
        instance = this; // NOSONAR it's fine because this class is technically a singleton

        m_browser = new Browser(parent, SWT.NONE);
        m_browser.addLocationListener(new KnimeBrowserLocationListener(this));
        m_browser.setMenu(new Menu(m_browser.getShell()));
        initializeResourceHandlers();

        if (viewInitializer == null) {
            activateViewInitializer(AppStateDerivedFromWorkflowProjectManager::new);
        }
    }

    @Inject
    void partActivated(@Active final MPart part) {
        boolean isBrowserView = part.getElementId().equals(BROWSER_VIEW_PART_ID);
        // This handler is called multiple times during perspective switch, before and after @PostConstruct.
        // `isRendered` is heuristically regarded to be the point in the life cycle at which the browser view is
        // 	ready for interaction.
        boolean isRendered = part.getObject() instanceof KnimeBrowserView;
        if (isBrowserView && isRendered && viewInitializer != null) {
            viewInitializer.accept(instance);
            viewInitializer = null; // NOSONAR because this is technically a singleton
        }
    }

    /**
     * Initializes and registers the {@link BrowserFunction BrowserFunctions} with the browser.
     *
     * @param appStateProvider required to initialize the {@link OpenWorkflowBrowserFunction}
     */
    @SuppressWarnings("unused") // Browser functions are registered on instantiation
    private void initBrowserFunctions(final AppStateProvider appStateProvider) {
        new SwitchToJavaUIBrowserFunction(m_browser);
        new OpenNodeViewBrowserFunction(m_browser);
        new OpenNodeDialogBrowserFunction(m_browser);
        new OpenLegacyFlowVariableDialogBrowserFunction(m_browser);
        new SaveWorkflowBrowserFunction(m_browser);
        new OpenWorkflowBrowserFunction(m_browser, appStateProvider);
		new CloseWorkflowBrowserFunction(m_browser, appStateProvider);
		new CreateWorkflowBrowserFunction(m_browser, appStateProvider);
		new OpenLayoutEditorBrowserFunction(m_browser);
		new OpenWorkflowCoachPreferencePageBrowserFunction(m_browser, appStateProvider);
        if (isRemoteDebuggingPortSet()) {
            new InitAppForTestingBrowserFunction(m_browser);
            new ClearAppForTestingBrowserFunction(m_browser);
        }
    }

    private static void initializeResourceHandlers() {
        CEFMiddlewareService.registerCustomResourceHandler(DOMAIN_NAME, urlString -> { // NOSONAR
            var path = stringToURL(urlString).getPath();
            var url = Platform.getBundle("org.knime.ui.js").getEntry(BASE_PATH + path);
            try {
                return FileLocator.toFileURL(url).openStream();
            } catch (Exception e) { // NOSONAR
                var message = "Problem loading UI resources at '" + urlString + "'. See log for details.";
                NodeLogger.getLogger(KnimeBrowserView.class).error(message, e);
                return new ByteArrayInputStream(message.getBytes(StandardCharsets.UTF_8));
            }
        });

        CEFMiddlewareService.registerPageAndPageBuilderResourceHandlers( //
            null, //
            PageResourceHandler.PORT_VIEW,  //
            PageResourceHandler.NODE_VIEW,  //
            PageResourceHandler.NODE_DIALOG //
        );
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

    void initializeJSBrowserCommunication() {
        try {
            var script = Files.readString(Path.of(getAbsolutePath(DOMAIN_NAME, "files/script-snippet.template")))
                .replace("##JSON_RPC_NOTIFICATION_ACTION_ID##", JSON_RPC_NOTIFICATION_ACTION_ID)
                .replace("##JSON_RPC_ACTION_ID##", JSON_RPC_ACTION_ID);
            if (!m_browser.execute(script)) {
                NodeLogger.getLogger(this.getClass())
                    .error("Script to initialize JS browser communication failed to execute");
            }
        } catch (IOException e) {
            throw new IllegalStateException("Failed to read script to initialize JS browser communication", e);
        }
    }

    private static String getAbsolutePath(final String bundle, final String relativePath) {
        var url = Platform.getBundle(bundle).getEntry(relativePath);
        try {
            var fileUrl = FileLocator.toFileURL(url);
            return Paths.get(new URI(fileUrl.getProtocol(), fileUrl.getFile(), null)).toString();
        } catch (IOException | URISyntaxException e) {
            // should never happen
            throw new IllegalStateException(e);
        }
    }

    private static URL stringToURL(final String url) {
        try {
            return new URL(url);
        } catch (MalformedURLException e) {
            throw new IllegalArgumentException("Not a valid URL");
        }
    }

	/**
	 * Clears the browser's url.
	 */
	private void clearUrl() {
		m_browser.setUrl(EMPTY_PAGE);
	}

	/**
	 * Sets the browser's URL to show the web-ui. The URL is either taken from
	 * the system property org.knime.ui.dev.url or, if not set, the actual
	 * file URL is used.
	 *
	 * @param ignoreEmptyPageAsDevUrl if <code>true</code> and the dev URL
	 * (org.knime.ui.dev.url system property) is set to be the empty page (URL
	 * is about:blank), the dev URL (i.e. empty page) will be ignored and the
	 * actual file URL is used
	 */
	private void setUrl(final boolean ignoreEmptyPageAsDevUrl) {
		if (m_browser.getUrl().equals(EMPTY_PAGE)) {
			if (!setDevURL(m_browser, ignoreEmptyPageAsDevUrl)) { // NOSONAR
			    m_browser.setUrl(APP_PAGE);
			}
		}
	}

	/**
	 * @return a new event consumer instance forwarding events to java-script
	 */
    private static EventConsumer createEventConsumer() {
        return initializeJavaBrowserCommunication(JSON_RPC_ACTION_ID, JSON_RPC_NOTIFICATION_ACTION_ID);
    }

	@Focus
	public void setFocus() {
		m_browser.setFocus();
	}

	@PreDestroy
	public void dispose() {
		m_browser.dispose();
	}

	private static boolean setDevURL(final Browser browser, final boolean ignoreEmptyPageAsDevUrl) {
		String initURL = System.getProperty(DEV_URL_PROP);
		if (initURL != null && (!ignoreEmptyPageAsDevUrl || !initURL.equals(EMPTY_PAGE))) {
			browser.setUrl(initURL);
			return true;
		} else {
			return false;
		}
	}

	private static boolean isRemoteDebuggingPortSet() {
		return System.getProperty(KnimeBrowserView.REMOTE_DEBUGGING_PORT_PROP) != null;
	}

	private static class AppStateDerivedFromWorkflowProjectManager implements AppState {

        private final List<OpenedWorkflow> m_openedWorkflows;

        AppStateDerivedFromWorkflowProjectManager() {
            var wpm = WorkflowProjectManager.getInstance();
            m_openedWorkflows = wpm.getWorkflowProjectsIds().stream()
                .map(id -> toOpenedWorkflow(wpm.getWorkflowProject(id).orElseThrow(), wpm.isActiveWorkflowProject(id)))
                .collect(Collectors.toList());
        }

        @Override
        public List<OpenedWorkflow> getOpenedWorkflows() {
            return m_openedWorkflows;
        }

        private static AppState.OpenedWorkflow toOpenedWorkflow(final WorkflowProject wp, final boolean isVisible) {
            return new AppState.OpenedWorkflow() {

                @Override
                public boolean isVisible() {
                    return isVisible;
                }

                @Override
                public String getWorkflowId() {
                    return NodeIDEnt.getRootID().toString();
                }

                @Override
                public String getProjectId() {
                    return wp.getID();
                }
            };
        }

	}

}
