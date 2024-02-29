package org.knime.ui.java.browser;

import static org.knime.ui.java.util.PerspectiveUtil.BROWSER_VIEW_PART_ID;

import com.equo.chromium.swt.Browser;
import com.equo.chromium.swt.WindowEvent;

import java.util.function.Supplier;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
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
import org.knime.ui.java.util.AppStatePersistor;
import org.knime.ui.java.util.PerspectiveUtil;

/**
 * Simple view containing a browser initialized with the knime-ui webapp (or a
 * debug message if in debug mode) and the communication backend injected.
 *
 * <br/><br/>
 * For a quick intro to the e4 application model please read 'E4_Application_Model.md'.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 * @author Kai Franze, KNIME GmbH
 */
public class KnimeBrowserView {

    @SuppressWarnings("javadoc")
    public static final NodeLogger LOGGER = NodeLogger.getLogger(KnimeBrowserView.class);

    @SuppressWarnings("javadoc")
    public static final String DOMAIN_NAME = "org.knime.ui.java";

    static final String EMPTY_PAGE = "about:blank";

    static final String DEV_URL_PROP = "org.knime.ui.dev.url";

    private static final String HTTP = "http";

    static final String BASE_URL = HTTP + "://" + DOMAIN_NAME;

    private static final String APP_PAGE = BASE_URL + "/index.html";

    private static Runnable viewInitializer = null;

    private static Browser browser;

    static boolean isInitialized = false;

    /**
     * Activates the view initializer that will be executed as soon as this view becomes finally visible (again). Once
     * the view initializer has been executed, it will be de-activated (and would need to be activated again).
     *
     * @param checkForUpdates whether to check for updates on initialization
     */
    public static void activateViewInitializer(final boolean checkForUpdates) {
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
    }

    /**
     * Clears the view. Called when the view is not needed anymore (for some time), e.g. on perspective switch.
     *
     * If the view is activated/used again, it need to be initialized either via
     * {@link #activateViewInitializer(Supplier, boolean)} or {@link #initViewForTesting(Supplier)}.
     */
    public static void clearView() {
        isInitialized = false;
        if (browser != null) {
            if (!browser.isDisposed()) {
                browser.setUrl(EMPTY_PAGE);
            }
            viewInitializer = null; // NOSONAR
        }
    }

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
        browser.addOpenWindowListener(this::cancelAndOpenInBrowser);
        browser.setMenu(new Menu(browser.getShell()));

        LifeCycle.get().create((name, function) -> new KnimeBrowserFunction(browser, name, function));

        if (viewInitializer == null) {
            viewInitializer = () -> { // NOSONAR
                if (!PerspectiveUtil.isClassicPerspectiveLoaded()) {
                    AppStatePersistor.loadAppState();
                }
                initView(false, true);
            };
        }
    }

    private void cancelAndOpenInBrowser(final WindowEvent windowEvent) {
        // cancels the navigation
        windowEvent.required = true;
        windowEvent.browser = null;

        if (windowEvent.data instanceof String location) {
            openBrowserWindow(location);
        } else {
            LOGGER.warnWithFormat("Event payload %s is not a valid navigation target -- must be a string",
                windowEvent.data);
        }

    }

    /**
     * Open a new browser window.
     *
     * @param location The location to navigate the new window to.
     */
    @SuppressWarnings("restriction")
    private void openBrowserWindow(final String location) {
        if (Boolean.getBoolean("org.knime.ui.java.use_cef_browser_for_external_links")) {
            // For testing purposes only!
            CEFUtils.openBrowserWindow(location);
        } else {
            WebUIUtil.openURLInExternalBrowserAndAddToDebugLog(location, getClass());
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

	@Focus
	public void setFocus() {
		browser.setFocus();
	}

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

}
