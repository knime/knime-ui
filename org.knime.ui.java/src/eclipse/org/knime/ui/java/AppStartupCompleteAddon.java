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
 */
package org.knime.ui.java;

import java.util.List;

import javax.inject.Inject;

import org.eclipse.e4.core.di.annotations.Optional;
import org.eclipse.e4.core.di.extensions.EventTopic;
import org.eclipse.e4.ui.model.application.MApplication;
import org.eclipse.e4.ui.model.application.ui.MUIElement;
import org.eclipse.e4.ui.model.application.ui.basic.MTrimBar;
import org.eclipse.e4.ui.model.application.ui.menu.MMenu;
import org.eclipse.e4.ui.model.application.ui.menu.MMenuElement;
import org.eclipse.e4.ui.model.application.ui.menu.MToolBar;
import org.eclipse.e4.ui.model.application.ui.menu.MTrimContribution;
import org.eclipse.e4.ui.workbench.UIEvents;
import org.eclipse.e4.ui.workbench.modeling.EModelService;
import org.eclipse.swt.widgets.Display;
import org.osgi.service.event.Event;

/**
 * Registered as fragment with the application model and called as soon as the
 * startup is completed.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public final class AppStartupCompleteAddon {

	@Inject
	private MApplication m_app;

	@Inject
	private EModelService m_modelService;

	@Inject
	@Optional
	public void applicationStarted(@EventTopic(UIEvents.UILifeCycle.APP_STARTUP_COMPLETE) final Event event) {

		// adds the button to switch to the web UI to the upper right corner (if
		// not already there)
		MUIElement el = m_modelService.find("org.knime.ui.java.toolbar.0", m_app);
		if (el == null) {
			MTrimContribution tc = (MTrimContribution) m_modelService.cloneSnippet(m_app,
					"org.knime.ui.java.trimcontribution.0", null);
			MToolBar toolbar = (MToolBar) tc.getChildren().get(0);
			MTrimBar trimBar = (MTrimBar) m_modelService.find("org.eclipse.ui.main.toolbar", m_app);
			Display.getDefault().syncExec(() -> m_modelService.move(toolbar, trimBar));
		}

		// hack to disable empty top-level menus which would otherwise magically
		// appear when switching back to the classic perspective
		m_app.getMenuContributions().forEach(mc -> {
			List<MMenuElement> children = mc.getChildren();
			// if there is a menu contribution with exactly one menu which in
			// turn is empty
			if (children.size() == 1 && children.get(0) instanceof MMenu
					&& ((MMenu) children.get(0)).getChildren().isEmpty()) {
				mc.setVisible(false);
				mc.setToBeRendered(false);
			}
		});
	}

}
