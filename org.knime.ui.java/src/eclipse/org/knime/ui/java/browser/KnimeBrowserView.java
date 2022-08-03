package org.knime.ui.java.browser;

import static org.knime.ui.java.PerspectiveUtil.BROWSER_VIEW_PART_ID;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.function.Consumer;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import javax.inject.Inject;

import org.eclipse.core.runtime.FileLocator;
import org.eclipse.core.runtime.Platform;
import org.eclipse.e4.core.contexts.Active;
import org.eclipse.e4.ui.di.Focus;
import org.eclipse.e4.ui.model.application.ui.basic.MPart;
import org.eclipse.swt.SWT;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Menu;
import org.knime.core.node.NodeLogger;
import org.knime.core.webui.node.PageResourceManager;
import org.knime.core.webui.node.port.PortViewManager;
import org.knime.gateway.impl.jsonrpc.JsonRpcRequestHandler;
import org.knime.gateway.impl.service.util.EventConsumer;
import org.knime.gateway.impl.webui.AppStateProvider;
import org.knime.gateway.impl.webui.jsonrpc.DefaultJsonRpcRequestHandler;
import org.knime.gateway.json.util.ObjectMapperUtil;
import org.knime.ui.java.UIPlugin;
import org.knime.ui.java.browser.function.ClearAppForTestingBrowserFunction;
import org.knime.ui.java.browser.function.CloseWorkflowBrowserFunction;
import org.knime.ui.java.browser.function.CreateWorkflowBrowserFunction;
import org.knime.ui.java.browser.function.InitAppForTestingBrowserFunction;
import org.knime.ui.java.browser.function.OpenLayoutEditorBrowserFunction;
import org.knime.ui.java.browser.function.OpenLegacyFlowVariableDialogBrowserFunction;
import org.knime.ui.java.browser.function.OpenNodeDialogBrowserFunction;
import org.knime.ui.java.browser.function.OpenNodeViewBrowserFunction;
import org.knime.ui.java.browser.function.OpenWorkflowBrowserFunction;
import org.knime.ui.java.browser.function.SaveWorkflowBrowserFunction;
import org.knime.ui.java.browser.function.SwitchToJavaUIBrowserFunction;

import com.equo.chromium.swt.Browser;
import com.equo.chromium.swt.BrowserFunction;
import com.equo.comm.api.CommServiceProvider;
import com.equo.middleware.api.IMiddlewareService;
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

    private static final String BASE_PATH = "dist/inlined";

    private Browser m_browser;

    private static final String JSON_RPC_ACTION_ID = "org.knime.ui.java.jsonrpc";

    private static final String JSON_RPC_NOTIFICATION_ACTION_ID = "org.knime.ui.java.jsonrpcNotification";

	@PostConstruct
	public void createPartControl(final Composite parent) {
		m_browser = new Browser(parent, SWT.NONE);
		m_browser.addLocationListener(new KnimeBrowserLocationListener(this));
		m_browser.setMenu(new Menu(m_browser.getShell()));
		initializeResourceHandlers();
	}

    @Inject
    void partActivated(@Active final MPart part) {
        boolean isBrowserView = part.getElementId().equals(BROWSER_VIEW_PART_ID);
		// This handler is called multiple times during perspective switch, before and after @PostConstruct.
		// `isRendered` is heuristically regarded to be the point in the life cycle at which the browser view is
		// 	ready for interaction.
        boolean isRendered = part.getObject() instanceof KnimeBrowserView;
        if (isBrowserView && isRendered) {
            ActivatedCallbackManager.notify((KnimeBrowserView)part.getObject());
            ActivatedCallbackManager.clear();
        }
    }

    /**
     * Allows one to defer calls on the browser view until it's available.
     *
     * @param callback called as soon as this view is completely loaded and activated
     */
    public static void addActivatedCallback(final Consumer<KnimeBrowserView> callback) {
        ActivatedCallbackManager.addCallback(callback);
    }

    /**
     * Notify callbacks exactly once when the browser view is activated *and* rendered.
	 * After the callbacks have been notified, it is not possible to register any further callbacks.
     *
     * @see KnimeBrowserView#partActivated(MPart)
     */
    private static class ActivatedCallbackManager {

        private static Set<Consumer<KnimeBrowserView>> callbacks = new HashSet<>();

        private static void addCallback(final Consumer<KnimeBrowserView> callback) {
            try {
                callbacks.add(callback);
            } catch (UnsupportedOperationException e) {
                throw new UnsupportedOperationException("Can not register callbacks after event has occurred", e);
            }
        }

        private static void notify(final KnimeBrowserView view) {
			if (callbacks.isEmpty()) {
				// no callbacks registered or already notified
				return;
			}
			callbacks.forEach(c -> c.accept(view));
			callbacks = Collections.emptySet();  // immutable
		}

		private static void clear() {
			callbacks = new HashSet<>();  // modifiable
		}
    }

    /**
     * Initializes and registers the {@link BrowserFunction BrowserFunctions} with the browser.
     *
     * @param appStateProvider required to initialize the {@link OpenWorkflowBrowserFunction}
     */
    public void initBrowserFunctions(final AppStateProvider appStateProvider) {
        new SwitchToJavaUIBrowserFunction(m_browser);
        new OpenNodeViewBrowserFunction(m_browser);
        new OpenNodeDialogBrowserFunction(m_browser);
        new OpenLegacyFlowVariableDialogBrowserFunction(m_browser);
        new SaveWorkflowBrowserFunction(m_browser);
        new OpenWorkflowBrowserFunction(m_browser, appStateProvider);
		new CloseWorkflowBrowserFunction(m_browser, appStateProvider);
		new CreateWorkflowBrowserFunction(m_browser, appStateProvider);
		new OpenLayoutEditorBrowserFunction(m_browser);
        if (isRemoteDebuggingPortSet()) {
            new InitAppForTestingBrowserFunction(m_browser, this);
            new ClearAppForTestingBrowserFunction(m_browser, this);
        }
    }

    private static void initializeResourceHandlers() {
        var context = UIPlugin.getContext();
        var reference = context.getServiceReference(IMiddlewareService.class);
        var middlewareService = context.getService(reference);
        if (middlewareService.getResourceHandlers().containsKey(HTTP + DOMAIN_NAME)) {
            return;
        }
        middlewareService.addResourceHandler(HTTP, DOMAIN_NAME, (request, headers) -> { // NOSONAR
            var path = stringToURL(request.getUrl()).getPath();
            var url = Platform.getBundle("org.knime.ui.js").getEntry(BASE_PATH + path);
            try {
                return FileLocator.toFileURL(url).openStream();
            } catch (Exception e) { // NOSONAR
                var message = "Problem loading UI resources at '" + request.getUrl() + "'. See log for details.";
                NodeLogger.getLogger(KnimeBrowserView.class).error(message, e);
                return new ByteArrayInputStream(message.getBytes(StandardCharsets.UTF_8));
            }
        });
        addPageResourceHandler(middlewareService, PortViewManager.getInstance());
    }

    // NOTE: duplicated code - org.knime.js.cef.CEFMiddlewareService.addPageResourceHandler
    private static void addPageResourceHandler(final IMiddlewareService middlewareService,
        final PageResourceManager<?> pageResourceManager) {
        var domainName = pageResourceManager.getDomainName();
        if (middlewareService.getResourceHandlers().containsKey(HTTP + domainName)) {
            return;
        }
        middlewareService.addResourceHandler(HTTP, domainName, (request, headers) -> { // NOSONAR
            var urlString = request.getUrl();
            return pageResourceManager.getPageResourceFromUrl(urlString).map(resource -> {
                try {
                    return resource.getInputStream();
                } catch (IOException e) {
                    return createErrorResponse(
                        "Problem resolving resource for '" + urlString + "'. See log for mor details.", e);
                }
            }).orElseGet(() -> createErrorResponse(
                "No resource found for '" + urlString + "'. Most likely an implementation error.", null));
        });
    }

    private static InputStream createErrorResponse(final String message, final Exception exception) {
        var logger = NodeLogger.getLogger(KnimeBrowserView.class);
        if (exception == null) {
            logger.error(message);
        } else {
            logger.error(message, exception);
        }
        return new ByteArrayInputStream(message.getBytes(StandardCharsets.UTF_8));
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
            var string =
                mapper.writeValueAsString(jsonrpc.put("jsonrpc", "2.0").put("method", name).set("params", params));
            return Base64.getEncoder().encodeToString(string.getBytes(StandardCharsets.UTF_8));
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
	public void clearUrl() {
		m_browser.setUrl(EMPTY_PAGE);
	}

	/**
	 * Sets the browser's URL to show the web-ui. The URL is either taken from
	 * the system property org.knime.ui.dev.url or, if not set, the actual
	 * file URL is used.
	 */
	public void setUrl() {
		setUrl(false);
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
	public void setUrl(final boolean ignoreEmptyPageAsDevUrl) {
		if (m_browser.getUrl().equals(EMPTY_PAGE)) {
			if (!setDevURL(m_browser, ignoreEmptyPageAsDevUrl)) { // NOSONAR
			    m_browser.setUrl(APP_PAGE);
			}
		}
	}

	/**
	 * @return a new event consumer instance forwarding events to java-script
	 */
    public EventConsumer createEventConsumer() {
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
}
