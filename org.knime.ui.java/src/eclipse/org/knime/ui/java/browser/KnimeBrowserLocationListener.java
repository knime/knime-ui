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

import org.eclipse.swt.browser.LocationEvent;
import org.eclipse.swt.browser.LocationListener;
import org.eclipse.swt.program.Program;
import org.knime.core.node.NodeLogger;

/**
 * Listens for changes of the URL in the KNIME browser and triggers respective
 * actions (e.g. external URLs are opened in the external browser).
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public class KnimeBrowserLocationListener implements LocationListener {

	@Override
	public void changing(final LocationEvent event) {
		// Any change of the location (i.e. URL) will be intercepted and the URL
		// opened in the external browser.
		// Except if the new location URL is the actual APP page, the EMPTY page,
		// or a localhost-URL (for development)
		if (isAppPage(event.location) || isEmptyPage(event.location) || isDevPage(event.location)) {
			// let the location change happen without further ado
		} else {
			if (!Program.launch(event.location)) {
				NodeLogger.getLogger(this.getClass())
						.error("Failed to open URL in external browser. The URL is: " + event.location);
			}
			event.doit = false;
		}
	}

	@Override
	public void changed(final LocationEvent event) {
		//
	}

	private static boolean isAppPage(final String url) {
		return url.endsWith(KnimeBrowserView.APP_PAGE);
	}

	private static boolean isEmptyPage(final String url) {
		return url.endsWith(KnimeBrowserView.EMPTY_PAGE);
	}

	private static boolean isDevPage(final String url) {
		return url.startsWith("http://localhost");
	}

}
