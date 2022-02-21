package org.knime.ui.java.browser;

import static org.knime.ui.java.PerspectiveUtil.BROWSER_VIEW_PART_ID;

import java.io.IOException;
import java.net.URL;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.function.BiConsumer;
import java.util.function.Consumer;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import javax.inject.Inject;

import org.apache.commons.text.StringEscapeUtils;
import org.eclipse.core.runtime.FileLocator;
import org.eclipse.core.runtime.Platform;
import org.eclipse.e4.core.contexts.Active;
import org.eclipse.e4.ui.di.Focus;
import org.eclipse.e4.ui.model.application.ui.basic.MPart;
import org.eclipse.swt.SWT;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Display;
import org.eclipse.swt.widgets.Menu;
import org.knime.core.node.NodeLogger;
import org.knime.gateway.impl.webui.AppStateProvider;
import org.knime.gateway.impl.webui.service.DefaultEventService;
import org.knime.gateway.json.util.ObjectMapperUtil;
import org.knime.ui.java.browser.function.ClearAppForTestingBrowserFunction;
import org.knime.ui.java.browser.function.InitAppForTestingBrowserFunction;
import org.knime.ui.java.browser.function.JsonRpcBrowserFunction;
import org.knime.ui.java.browser.function.OpenNodeDialogBrowserFunction;
import org.knime.ui.java.browser.function.OpenNodeViewBrowserFunction;
import org.knime.ui.java.browser.function.OpenWorkflowBrowserFunction;
import org.knime.ui.java.browser.function.SaveWorkflowBrowserFunction;
import org.knime.ui.java.browser.function.SwitchToJavaUIBrowserFunction;

import com.equo.chromium.swt.Browser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

/**
 * Simple view containing a browser initialized with the knime-ui webapp (or a
 * debug message if in debug mode) and the {@link JsonRpcBrowserFunction}.
 *
 * <br/><br/>
 * For a quick intro to the e4 application model please read 'E4_Application_Model.md'.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public class KnimeBrowserView {

	static final String APP_PAGE = "dist/inlined/index.html";

	static final String EMPTY_PAGE = "about:blank";

	private static final String REMOTE_DEBUGGING_PORT_PROP = "chromium.remote_debugging_port";

	private static final String DEV_URL_PROP = "org.knime.ui.dev.url";

	private Browser m_browser;

	@PostConstruct
	public void createPartControl(final Composite parent) {
		m_browser = new Browser(parent, SWT.NONE);
		m_browser.addLocationListener(new KnimeBrowserLocationListener());
		m_browser.setMenu(new Menu(m_browser.getShell()));
		BiConsumer<String, Object> eventConsumer = createEventConsumer(m_browser);
		DefaultEventService.getInstance().addEventConsumer(eventConsumer);
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
        }
    }

    /**
     * @see ActivatedCallbackManager
     */
    public static void addActivatedCallback(final Consumer<KnimeBrowserView> callback) {
        ActivatedCallbackManager.addCallback(callback);
    }

	public static void clearActivatedCallbacks() {
		ActivatedCallbackManager.clear();
	}

    /**
     * Notify callbacks exactly once when the browser view is activated *and* rendered.
	 * After the callbacks have been notified, it is not possible to register any further callbacks.
     *
     * @see KnimeBrowserView#partActivated(MPart)
     */
    private static class ActivatedCallbackManager {

        private static Set<Consumer<KnimeBrowserView>> CALLBACKS = new HashSet<>();

        private static void addCallback(final Consumer<KnimeBrowserView> callback) {
            try {
                CALLBACKS.add(callback);
            } catch (UnsupportedOperationException e) {
                throw new UnsupportedOperationException("Can not register callbacks after event has occurred", e);
            }
        }

        private static void notify(final KnimeBrowserView view) {
			if (CALLBACKS.isEmpty()) {
				// no callbacks registered or already notified
				return;
			}
			CALLBACKS.forEach(c -> c.accept(view));
			CALLBACKS = Collections.emptySet();  // immutable
		}

		private static void clear() {
			CALLBACKS = new HashSet<>();  // modifiable
		}
    }

    public void initBrowserFunctions(final AppStateProvider appStateProvider) {
        new JsonRpcBrowserFunction(m_browser);
        new SwitchToJavaUIBrowserFunction(m_browser);
        new OpenNodeViewBrowserFunction(m_browser);
        new OpenNodeDialogBrowserFunction(m_browser);
        new SaveWorkflowBrowserFunction(m_browser);
        new OpenWorkflowBrowserFunction(m_browser, appStateProvider);
        if (isRemoteDebuggingPortSet()) {
            new InitAppForTestingBrowserFunction(m_browser, this);
            new ClearAppForTestingBrowserFunction(m_browser, this);
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
				setAppUrl();
			}
		}
	}

	/**
	 * Sets the URL to the actual application page (served from the file system).
	 */
	private void setAppUrl() {
		URL url = Platform.getBundle("org.knime.ui.js").getEntry(APP_PAGE);
		try {
			String path = FileLocator.toFileURL(url).getPath();
			m_browser.setUrl("file://" + path);
		} catch (IOException e) {
			// should never happen
			throw new IllegalStateException(e);
		}
	}

	private static BiConsumer<String, Object> createEventConsumer(final Browser browser) {
		final ObjectMapper mapper = ObjectMapperUtil.getInstance().getObjectMapper();
		return (name, event) -> createJsonRpcNotificationAndSendToBrowser(browser, mapper, name, event);
	}

	private static void createJsonRpcNotificationAndSendToBrowser(final Browser browser, final ObjectMapper mapper,
			final String name, final Object event) {
		// wrap event into a jsonrpc notification (method == event-name) and serialize
		ObjectNode jsonrpc = mapper.createObjectNode();
		ArrayNode params = jsonrpc.arrayNode();
		params.addPOJO(event);
		try {
			String message = mapper
					.writeValueAsString(jsonrpc.put("jsonrpc", "2.0").put("method", name).set("params", params));
			String jsCode = "jsonrpcNotification(\"" + StringEscapeUtils.escapeJava(message) + "\");";
			Display.getDefault().syncExec(() -> browser.execute(jsCode));
		} catch (JsonProcessingException ex) {
			NodeLogger.getLogger(KnimeBrowserView.class)
					.error("Problem creating a json-rpc notification in order to send an event", ex);
		}
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
