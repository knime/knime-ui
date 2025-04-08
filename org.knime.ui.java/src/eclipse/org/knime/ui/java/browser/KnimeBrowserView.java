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
package org.knime.ui.java.browser;

import static org.knime.ui.java.browser.KnimeBrowserLocationListener.isDevToolsPage;
import static org.knime.ui.java.util.PerspectiveUtil.BROWSER_VIEW_PART_ID;

import java.util.Optional;

import javax.inject.Inject;

import org.eclipse.e4.core.contexts.Active;
import org.eclipse.e4.ui.di.Focus;
import org.eclipse.e4.ui.model.application.ui.basic.MPart;
import org.eclipse.swt.SWT;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Menu;
import org.knime.core.node.NodeLogger;
import org.knime.core.webui.WebUIUtil;
import org.knime.js.cef.CEFUtils;
import org.knime.ui.java.browser.lifecycle.LifeCycle;
import org.knime.ui.java.browser.lifecycle.LifeCycle.StateTransition;

import com.equo.chromium.swt.Browser;
import com.equo.chromium.swt.WindowEvent;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;

/**
 * Simple view containing a browser initialized with the knime-ui webapp (or a
 * debug message if in debug mode) and the communication backend injected.
 * <p>
 * <br/><br/>
 * For a quick intro to the e4 application model please read 'E4_Application_Model.md'.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 * @author Kai Franze, KNIME GmbH
 */
public class KnimeBrowserView {

    @SuppressWarnings({"javadoc", "MissingJavadoc"})
    public static final NodeLogger LOGGER = NodeLogger.getLogger(KnimeBrowserView.class);

    @SuppressWarnings({"javadoc", "MissingJavadoc"})
    public static final String DOMAIN_NAME = "org.knime.ui.java";

    static final String EMPTY_PAGE = "about:blank";

    static final String DEV_URL_PROP = "org.knime.ui.dev.url";

    private static final String SCHEME = "https";

    @SuppressWarnings({"javadoc", "MissingJavadoc"})
    public static final String BASE_URL = SCHEME + "://" + DOMAIN_NAME;

    private static final String APP_PAGE = BASE_URL + "/index.html";

    private static Runnable viewInitializer;

    private static Browser browser;

    private static KnimeBrowserHealthChecker healthChecker;

    static boolean isInitialized;

    /**
     * Activates the view initializer that will be executed as soon as this view becomes finally visible (again). Once
     * the view initializer has been executed, it will be de-activated (and would need to be activated again).
     *
     * @param checkForUpdates whether to check for updates on initialization
     */
    public static synchronized void activateViewInitializer(final boolean checkForUpdates) {
        viewInitializer = () -> initView(false, checkForUpdates);
    }

    /**
     * Initializes the view for testing purposes.
     */
    public static void initViewForTesting() {
        if (browser == null) {
            throw new IllegalStateException("No browser view instance available");
        }
        initView(true, false);
    }

    private static void initView(final boolean ignoreEmptyPageAsDevUrl,
        final boolean checkForUpdates) {
        LifeCycle.get().init(checkForUpdates); // NOSONAR
        isInitialized = true;
        setUrl(ignoreEmptyPageAsDevUrl);
        healthChecker = new KnimeBrowserHealthChecker(browser);
    }

    /**
     * Clears the view. Called when the view is not needed anymore (for some time), e.g. on perspective switch.
     * <p>
     * If the view is activated/used again, it need to be initialized either via
     * {@link #activateViewInitializer(boolean)} or {@link #initViewForTesting()}.
     */
    public static void clearView() {
        isInitialized = false;
        if (healthChecker != null) {
            healthChecker.cancel();
            healthChecker = null;
        }
        if (browser != null) {
            if (!browser.isDisposed()) {
                browser.setUrl(EMPTY_PAGE);
            }
            viewInitializer = null; // NOSONAR
        }
    }

    @SuppressWarnings({"MissingJavadoc", "javadoc"})
    @PostConstruct
    public void createPartControl(final Composite parent) {
        // This is a 'quasi' singleton. Even though it has a public constructor it's only expected to have one single
        // instance and will fail if this method is called on another instance again.
        if (browser != null) {
            throw new IllegalStateException(
                "Instance can't be created. There's only one instance of the KnimeBrowserView allowed.");
        }

        browser = new Browser(parent, SWT.NONE); // NOSONAR
        browser.addLocationListener(new KnimeBrowserLocationListener(browser));
        browser.addOpenWindowListener(KnimeBrowserView::cancelAndOpenInBrowser);
        browser.setMenu(new Menu(browser.getShell()));
        CEFUtils.registerNodeLogger(LOGGER, browser);

        LifeCycle.get().create((name, function) -> new KnimeBrowserFunction(browser, name, function));

        if (viewInitializer == null) {
            viewInitializer = () -> initView(false, true);
        }

    }

    private static void cancelAndOpenInBrowser(final WindowEvent windowEvent) {
        if (windowEvent.data instanceof String location) {
            if (isDevToolsPage(location)) {
                // allow dev tools to be opened in a separate Equo Chromium window
                return;
            }
            cancelNavigation(windowEvent);
            openBrowserWindow(location);
        } else {
            cancelNavigation(windowEvent);
            LOGGER.warnWithFormat("Event payload %s is not a valid navigation target -- must be a string",
                windowEvent.data);
        }
    }

    private static void cancelNavigation(final WindowEvent windowEvent) {
        windowEvent.required = true;
        windowEvent.browser = null;
    }

    /**
     * Open a new browser window.
     *
     * @param location The location to navigate the new window to.
     */
    @SuppressWarnings("restriction")
    private static void openBrowserWindow(final String location) {
        if (Boolean.getBoolean("org.knime.ui.java.use_cef_browser_for_external_links")) {
            // For testing purposes only!
            CEFUtils.openBrowserWindow(location);
        } else {
            WebUIUtil.openURLInExternalBrowserAndAddToDebugLog(location, KnimeBrowserView.class);
        }
    }

    @Inject
    synchronized void partActivated(@Active final MPart part) {
        if (viewInitializer == null) {
            return;
        }
        var vi = viewInitializer;
        viewInitializer = null;
        boolean isBrowserView = part.getElementId().equals(BROWSER_VIEW_PART_ID);
        // This handler is called multiple times during perspective switch, before and after @PostConstruct.
        // `isRendered` is heuristically regarded to be the point in the life cycle at which the browser view is
        // 	ready for interaction.
        boolean isRendered = part.getObject() instanceof KnimeBrowserView;
        if (isBrowserView && isRendered) {
            vi.run();
        }
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
    private static void setUrl(final boolean ignoreEmptyPageAsDevUrl) {
        assert LifeCycle.get().isLastStateTransition(StateTransition.INIT);
        if (!setDevURL(browser, ignoreEmptyPageAsDevUrl)) { // NOSONAR
            browser.setUrl(APP_PAGE);
        }
    }

	@SuppressWarnings({"MissingJavadoc", "javadoc"})
    @Focus
	public void setFocus() {
		browser.setFocus();
	}

    @SuppressWarnings({"MissingJavadoc", "javadoc"})
    @PreDestroy
    public void dispose() {
        clearView();
        browser.dispose();
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

    /**
     * @return Optional URL the externally served web app is running on, if set.
     */
    public static Optional<String> getDevURL() {
        return Optional.ofNullable(System.getProperty(DEV_URL_PROP));
    }

}
