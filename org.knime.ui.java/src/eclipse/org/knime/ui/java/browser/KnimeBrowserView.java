package org.knime.ui.java.browser;

import java.io.IOException;
import java.net.URL;

import org.eclipse.core.runtime.FileLocator;
import org.eclipse.core.runtime.Platform;
import org.eclipse.swt.SWT;
import org.eclipse.swt.browser.ProgressEvent;
import org.eclipse.swt.browser.ProgressListener;
import org.eclipse.swt.chromium.Browser;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.ui.part.ViewPart;
import org.knime.ui.java.browser.function.JsonRpcBrowserFunction;
import org.osgi.framework.Bundle;
import org.osgi.framework.FrameworkUtil;

/**
 * Simple view containing a browser initialized with the knime-ui webapp (or a
 * debug message if in debug mode) and the {@link JsonRpcBrowserFunction}.
 * 
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public class KnimeBrowserView extends ViewPart {

	protected Browser m_browser;

	@Override
	public void createPartControl(final Composite parent) {
		m_browser = new Browser(parent, SWT.NONE);
		new JsonRpcBrowserFunction(m_browser);
		if (!displayDebugMessageIfInDebugMode(m_browser)) {
			URL url = Platform.getBundle("org.knime.ui.js").getEntry("dist/inlined/index.html");
			try {
				String path = FileLocator.toFileURL(url).getPath();
				m_browser.setUrl("file://" + path);
			} catch (IOException e) {
				// should never happen
				throw new RuntimeException(e);
			}
		}
	}

	private static boolean displayDebugMessageIfInDebugMode(Browser browser) {
		String port = System.getProperty("org.eclipse.swt.chromium.remote-debugging-port");
		if (port == null) {
			return false;
		} else {
			Bundle myBundle = FrameworkUtil.getBundle(KnimeBrowserView.class);
			try {
				URL url = myBundle.getEntry("web/debug.html");
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
				return true;
			} catch (IOException e) {
				throw new RuntimeException(e);
			}
		}
	}

	@Override
	public void dispose() {
		//
	}

	@Override
	public void setFocus() {
		m_browser.setFocus();
	}

}
