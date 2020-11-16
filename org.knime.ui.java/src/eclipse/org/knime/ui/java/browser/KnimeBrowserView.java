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
import org.knime.ui.java.browser.function.JsonRpcBrowserFunction;
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

	private static final String APP_PAGE = "dist/inlined/index.html";

	private static final String EMPTY_PAGE = "about:blank";

	private Browser m_browser;

	@PostConstruct
	public void createPartControl(final Composite parent) {
		m_browser = new Browser(parent, SWT.NONE);
		new JsonRpcBrowserFunction(m_browser);
		new SwitchToJavaUIBrowserFunction(m_browser);
		setUrl();
		BiConsumer<String, EventEnt> eventConsumer = createEventConsumer(m_browser);
		DefaultEventService.getInstance().addEventConsumer(eventConsumer);
	}

	/**
	 * Clears the browser's url.
	 */
	public void clearUrl() {
		m_browser.setUrl(EMPTY_PAGE);
	}

	/**
	 * Sets the browser's URL to show the web-ui.
	 */
	public void setUrl() {
		if (m_browser.getUrl().equals(EMPTY_PAGE)) {
			if (!setDebugURL(m_browser)) { // NOSONAR
				URL url = Platform.getBundle("org.knime.ui.js").getEntry(APP_PAGE);
				try {
					String path = FileLocator.toFileURL(url).getPath();
					m_browser.setUrl("file://" + path);
				} catch (IOException e) {
					// should never happen
					throw new IllegalStateException(e);
				}
			}
		}
	}

	private static BiConsumer<String, EventEnt> createEventConsumer(final Browser browser) {
		final ObjectMapper mapper = ObjectMapperUtil.getInstance().getObjectMapper();
		return (name, event) -> createJsonRpcNotificationAndSendToBrowser(browser, mapper, name, event);
	}

	private static void createJsonRpcNotificationAndSendToBrowser(final Browser browser, final ObjectMapper mapper,
			final String name, final EventEnt event) {
		// wrap event into a jsonrpc notification (method == event-name) and
		// serialize
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
					.error("Problem creating a json-rcp notification in order to send an event", ex);
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

	private static boolean setDebugURL(final Browser browser) {
		String port = System.getProperty("org.eclipse.swt.chromium.remote-debugging-port");
		String initURL = System.getProperty("org.knime.ui.debug.url");
		if (port != null && initURL != null) {
			browser.setUrl(initURL);
			return true;
		} else {
			return false;
		}
	}
}
