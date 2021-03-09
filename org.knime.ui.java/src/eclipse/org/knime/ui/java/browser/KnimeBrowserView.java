package org.knime.ui.java.browser;

import java.io.IOException;
import java.net.URL;
import java.util.function.BiConsumer;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;

import org.apache.commons.text.StringEscapeUtils;
import org.eclipse.core.runtime.FileLocator;
import org.eclipse.core.runtime.Platform;
import org.eclipse.e4.ui.di.Focus;
import org.eclipse.swt.SWT;
import org.eclipse.swt.chromium.Browser;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Display;
import org.knime.core.node.NodeLogger;
import org.knime.gateway.api.webui.entity.EventEnt;
import org.knime.gateway.impl.webui.service.DefaultEventService;
import org.knime.gateway.json.util.ObjectMapperUtil;
import org.knime.ui.java.browser.function.ClearAppForTestingBrowserFunction;
import org.knime.ui.java.browser.function.InitAppForTestingBrowserFunction;
import org.knime.ui.java.browser.function.JsonRpcBrowserFunction;
import org.knime.ui.java.browser.function.OpenNodeDialogBrowserFunction;
import org.knime.ui.java.browser.function.OpenNodeViewBrowserFunction;
import org.knime.ui.java.browser.function.SwitchToJavaUIBrowserFunction;

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

	private static final String REMOTE_DEBUGGING_PORT_PROP = "org.eclipse.swt.chromium.remote-debugging-port";

	private static final String DEBUG_URL_PROP = "org.knime.ui.debug.url";

	private Browser m_browser;

	@PostConstruct
	public void createPartControl(final Composite parent) {
		m_browser = new Browser(parent, SWT.NONE);
		m_browser.addLocationListener(new KnimeBrowserLocationListener());
		addBrowserFunctions(m_browser);
		setUrl();
		BiConsumer<String, EventEnt> eventConsumer = createEventConsumer(m_browser);
		DefaultEventService.getInstance().addEventConsumer(eventConsumer);
	}

	private void addBrowserFunctions(final Browser browser) {
		new JsonRpcBrowserFunction(browser);
		new SwitchToJavaUIBrowserFunction(browser);
		new OpenNodeViewBrowserFunction(browser);
		new OpenNodeDialogBrowserFunction(browser);
		if (isRemoteDebuggingPortSet()) {
			new InitAppForTestingBrowserFunction(browser, this);
			new ClearAppForTestingBrowserFunction(browser, this);
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
	 * the system property org.knime.ui.debug.url or, if not set, the actual
	 * file URL is used.
	 */
	public void setUrl() {
		setUrl(false);
	}

	/**
	 * Sets the browser's URL to show the web-ui. The URL is either taken from
	 * the system property org.knime.ui.debug.url or, if not set, the actual
	 * file URL is used.
	 *
	 * @param ignoreEmptyPageAsDebugUrl if <code>true</code> and the debug URL
	 * (org.knime.ui.debug.url system property) is set to be the empty page (URL
	 * is about:blank), the debug URL (i.e. empty page) will be ignored and the
	 * actual file URL is used
	 */
	public void setUrl(final boolean ignoreEmptyPageAsDebugUrl) {
		if (m_browser.getUrl().equals(EMPTY_PAGE)) {
			if (!setDebugURL(m_browser, ignoreEmptyPageAsDebugUrl)) { // NOSONAR
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

	private static BiConsumer<String, EventEnt> createEventConsumer(final Browser browser) {
		final ObjectMapper mapper = ObjectMapperUtil.getInstance().getObjectMapper();
		return (name, event) -> createJsonRpcNotificationAndSendToBrowser(browser, mapper, name, event);
	}

	private static void createJsonRpcNotificationAndSendToBrowser(final Browser browser, final ObjectMapper mapper,
			final String name, final EventEnt event) {
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

	private static boolean setDebugURL(final Browser browser, final boolean ignoreEmptyPageAsDebugUrl) {
		String port = System.getProperty(REMOTE_DEBUGGING_PORT_PROP);
		String initURL = System.getProperty(DEBUG_URL_PROP);
		if (port != null && initURL != null && (!ignoreEmptyPageAsDebugUrl || !initURL.equals(EMPTY_PAGE))) {
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
