package org.knime.ui.java.browser;

import java.io.IOException;
import java.net.URL;
import java.util.function.BiConsumer;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;

import org.eclipse.core.runtime.FileLocator;
import org.eclipse.core.runtime.Platform;
import org.eclipse.e4.ui.di.Focus;
import org.eclipse.swt.SWT;
import org.eclipse.swt.browser.ProgressEvent;
import org.eclipse.swt.browser.ProgressListener;
import org.eclipse.swt.chromium.Browser;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Display;
import org.knime.gateway.api.webui.entity.EventEnt;
import org.knime.gateway.impl.webui.service.DefaultEventService;
import org.knime.gateway.json.util.ObjectMapperUtil;
import org.knime.ui.java.browser.function.JsonRpcBrowserFunction;
import org.knime.ui.java.browser.function.SwitchToJavaUIBrowserFunction;
import org.osgi.framework.Bundle;
import org.osgi.framework.FrameworkUtil;

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

	private static final String DEBUG_PAGE = "web/debug.html";

	private Browser m_browser;

	@PostConstruct
	public void createPartControl(final Composite parent) {
		m_browser = new Browser(parent, SWT.NONE);
		new JsonRpcBrowserFunction(m_browser);
		new SwitchToJavaUIBrowserFunction(m_browser);
		setUrl();
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
			if (!displayDebugMessageIfInDebugMode(m_browser)) { // NOSONAR
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
		BiConsumer<String, EventEnt> eventConsumer = createEventConsumer(m_browser);
		DefaultEventService.getInstance().addEventConsumer(eventConsumer);
	}

	private static BiConsumer<String, EventEnt> createEventConsumer(final Browser browser) {
		return (name, event) -> {
			// wrap event into a jsonrpc notification (method == event-name) and serialize
			ObjectMapper mapper = ObjectMapperUtil.getInstance().getObjectMapper();
			ObjectNode jsonrpc = mapper.createObjectNode();
			ArrayNode params = jsonrpc.arrayNode();
			params.addPOJO(event);
			String message = jsonrpc.put("jsonrpc", "2.0").put("method", name).set("params", params).toString();
			Display.getDefault().asyncExec(() -> browser.execute("jsonrpcNotification('" + message + "')"));
		};
	}

	@Focus
	public void setFocus() {
		m_browser.setFocus();
	}

	@PreDestroy
	public void dispose() {
		m_browser.dispose();
	}

	private static boolean displayDebugMessageIfInDebugMode(final Browser browser) {
		String port = System.getProperty("org.eclipse.swt.chromium.remote-debugging-port");
		if (port == null) {
			return false;
		} else {
			String initURL = System.getProperty("org.knime.ui.debug.url");
			if (initURL != null) {
				browser.setUrl(initURL);
				return true;
			} else {
				setDebugMessagePage(browser, port);
				return true;
			}
		}
	}

	private static void setDebugMessagePage(final Browser browser, final String port) {
		Bundle myBundle = FrameworkUtil.getBundle(KnimeBrowserView.class);
		try {
			URL url = myBundle.getEntry(DEBUG_PAGE);
			String path = FileLocator.toFileURL(url).getPath();
			browser.setUrl("file://" + path);
			final String debugMsg = "Remote debugger running at http://localhost:" + port;
			browser.addProgressListener(new ProgressListener() {

				@Override
				public void completed(final ProgressEvent event) {
					browser.execute("setText('" + debugMsg + "')");
					browser.removeProgressListener(this);
				}

				@Override
				public void changed(final ProgressEvent event) {
					//
				}
			});
		} catch (IOException e) {
			throw new IllegalStateException(e);
		}
	}
}
