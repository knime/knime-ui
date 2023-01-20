package org.knime.ui.java.browser;

import static org.knime.ui.java.util.PerspectiveUtil.BROWSER_VIEW_PART_ID;

import java.util.function.Supplier;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import javax.inject.Inject;

import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.e4.core.contexts.Active;
import org.eclipse.e4.ui.di.Focus;
import org.eclipse.e4.ui.model.application.ui.basic.MPart;
import org.eclipse.swt.SWT;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Menu;
import org.eclipse.ui.ISaveablePart2;
import org.knime.core.node.NodeLogger;
import org.knime.gateway.impl.webui.AppStateProvider.AppState;
import org.knime.ui.java.browser.lifecycle.LifeCycle;
import org.knime.ui.java.browser.lifecycle.LifeCycle.StateTransition;

import com.equo.chromium.swt.Browser;

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
public class KnimeBrowserView implements ISaveablePart2 {

    @SuppressWarnings("javadoc")
    public static final NodeLogger LOGGER = NodeLogger.getLogger(KnimeBrowserView.class);

    @SuppressWarnings("javadoc")
    public static final String DOMAIN_NAME = "org.knime.ui.java";

    static final String EMPTY_PAGE = "about:blank";

    private static final String DEV_URL_PROP = "org.knime.ui.dev.url";

    private static final String HTTP = "http";

    static final String BASE_URL = HTTP + "://" + DOMAIN_NAME;

    private static final String APP_PAGE = BASE_URL + "/index.html";

    private static Runnable viewInitializer = null;

    private static Browser browser;

    /**
     * Activates the view initializer that will be executed as soon as this view becomes finally visible (again). Once
     * the view initializer has been executed, it will be de-activated (and would need to be activated again).
     *
     * @param appStateSupplier supplies the app state for the UI
     * @param checkForUpdates whether to check for updates on initialization
     */
    public static void activateViewInitializer(final Supplier<AppState> appStateSupplier,
        final boolean checkForUpdates) {
        viewInitializer = () -> initView(appStateSupplier, false, checkForUpdates);
    }

    /**
     * Initializes the view for testing purposes.
     *
     * @param appStateSupplier supplies the app state for the UI
     */
    public static void initViewForTesting(final Supplier<AppState> appStateSupplier) {
        if (browser == null) {
            throw new IllegalStateException("No browser view instance available");
        }
        initView(appStateSupplier, true, false);
    }

    private static void initView(final Supplier<AppState> appStateSupplier, final boolean ignoreEmptyPageAsDevUrl,
        final boolean checkForUpdates) {
        LifeCycle.get().init(appStateSupplier, browser, checkForUpdates); // NOSONAR
        setUrl(ignoreEmptyPageAsDevUrl);
    }

    /**
     * Clears the view. Called when the view is not needed anymore (for some time), e.g. on perspective switch.
     *
     * If the view is activated/used again, it need to be initialized either via
     * {@link #activateViewInitializer(Supplier, boolean)} or {@link #initViewForTesting(Supplier)}.
     */
    public static void clearView() {
        if (browser != null) {
            if (!browser.isDisposed()) {
                browser.setUrl(EMPTY_PAGE);
            }
            LifeCycle.get().saveState();
            LifeCycle.get().suspend();
            viewInitializer = null;
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

        LifeCycle.get().create();

        browser = new Browser(parent, SWT.NONE); // NOSONAR
        browser.addLocationListener(new KnimeBrowserLocationListener(browser));
        browser.setMenu(new Menu(browser.getShell()));

        if (viewInitializer == null) {
            activateViewInitializer(null, true);
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
            synchronized (this) {
                viewInitializer.run();
                viewInitializer = null; // NOSONAR because this is technically a singleton
            }
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
		if (browser.getUrl().equals(EMPTY_PAGE)) {
			if (!setDevURL(browser, ignoreEmptyPageAsDevUrl)) { // NOSONAR
			    browser.setUrl(APP_PAGE);
			}
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

    @Override
    public void doSave(final IProgressMonitor monitor) {
        //
    }

    @Override
    public void doSaveAs() {
        //
    }

    @Override
    public boolean isDirty() {
        return LifeCycle.get().isBeforeStateTransition(StateTransition.SUSPEND);
    }

    @Override
    public boolean isSaveAsAllowed() {
        return false;
    }

    @Override
    public boolean isSaveOnCloseNeeded() {
        return true;
    }

    @Override
    public int promptToSaveOnClose() {
        // This is being called by the eclipse framework before this view is disposed (usually only on shutdown).
        // And before it's disposed, we need, e.g., to ask the user to save (and save) all the workflows (or abort
        // the shutdown, if the user cancels).
        LifeCycle.get().saveState();
        // cancel if we didn't successfully transition to the next phase
        return LifeCycle.get().isLastStateTransition(StateTransition.SAVE_STATE) ? YES : CANCEL;
    }

}
