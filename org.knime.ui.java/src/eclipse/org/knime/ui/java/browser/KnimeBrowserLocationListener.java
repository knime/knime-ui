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
 *
 * History
 *   Jan 7, 2021 (hornm): created
 */
package org.knime.ui.java.browser;

import static org.knime.js.cef.middleware.CEFMiddlewareService.isCEFMiddlewareResource;

import java.util.function.Supplier;

import org.eclipse.swt.browser.LocationEvent;
import org.eclipse.swt.browser.LocationListener;
import org.eclipse.swt.widgets.Display;
import org.knime.js.cef.CEFZoomSync;
import org.knime.ui.java.browser.lifecycle.LifeCycle;
import org.knime.ui.java.browser.lifecycle.LifeCycle.StateTransition;

import com.equo.chromium.swt.Browser;

/**
 * Listens for changes of the URL in the KNIME browser and triggers respective
 * actions (e.g. external URLs are opened in the external browser).
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public class KnimeBrowserLocationListener implements LocationListener {

    private final Browser m_browser;

    KnimeBrowserLocationListener(final Browser browser) {
        m_browser = browser;
    }

    @Override
    public void changing(final LocationEvent event) {
        if (isCEFMiddlewareResource(event.location)) {
            // Allow location change to middleware resources, these are handled by resource handlers.
        } else if (isAppPage(event.location) || isEmptyPage(event.location) || isDevPage(event.location)) {
            // Allow location change, but run the reload life-cycle state transition
            if (LifeCycle.get().isLastStateTransition(StateTransition.WEB_APP_LOADED)) {
                LifeCycle.get().reload();
            }
//        } else if (ImportURI.importURI(createCursorLocationSupplier(m_browser), event.location)) {
//            // Don't change the location but import the URI instead
//            event.doit = false;
        } else {
//            WebUIUtil.openURLInExternalBrowserAndAddToDebugLog(event.location, KnimeBrowserView.class);
            event.doit = false;
        }
    }

    private static Supplier<int[]> createCursorLocationSupplier(final Browser browser) {
        return () -> {
            var display = Display.getCurrent();
            var displayCursorLocation = display.getCursorLocation();
            var browserCursorLocation = display.map(null, browser, displayCursorLocation);
            return new int[]{browserCursorLocation.x, browserCursorLocation.y};
        };
    }

    @Override
    public void changed(final LocationEvent event) {
        var url = event.location;
        CEFZoomSync.subscribeAndUpdateZoom(m_browser);
        if (KnimeBrowserView.isInitialized && (isAppPage(url) || isDevPage(url))) {
            LifeCycle.get().webAppLoaded();
        }
    }

	private static boolean isAppPage(final String url) {
		return url.startsWith(KnimeBrowserView.BASE_URL);
	}

	private static boolean isEmptyPage(final String url) {
		return url.endsWith(KnimeBrowserView.EMPTY_PAGE);
	}

    private static boolean isDevPage(final String url) {
        var devUrl = System.getProperty(KnimeBrowserView.DEV_URL_PROP);
        return devUrl != null && url.startsWith(devUrl);
    }

}
