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
 *   Nov 3, 2022 (kai): created
 */
package org.knime.ui.java.browser.function;

import java.util.function.Predicate;

import org.eclipse.ui.dialogs.PreferencesUtil;
import org.knime.core.ui.workflowcoach.NodeRecommendationManager;
import org.knime.core.ui.workflowcoach.data.NodeTripleProviderFactory;
import org.knime.gateway.impl.webui.AppStateProvider;

import com.equo.chromium.swt.Browser;
import com.equo.chromium.swt.BrowserFunction;

/**
 * Browser function opening the workflow coach preference pages
 *
 * @author Kai Franze, KNIME GmbH
 */
public class OpenWorkflowCoachPreferencePageBrowserFunction extends BrowserFunction {

    private static final String FUNCTION_NAME = "openWorkflowCoachPreferencePage";

    private static final String PREFERENCE_PAGE_ID = "org.knime.workbench.workflowcoach";

    private final AppStateProvider m_appStateProvider;

    /**
     * Opens the workflow coach preference pages
     *
     * @param browser
     * @param appStateProvider
     */
    public OpenWorkflowCoachPreferencePageBrowserFunction(final Browser browser, final AppStateProvider appStateProvider) {
        super(browser, FUNCTION_NAME);
        m_appStateProvider = appStateProvider;
    }

    @Override
    public Object function(final Object[] args) {
        var displayedIds = NodeRecommendationManager.getNodeTripleProviderFactories().stream()//
            .map(NodeTripleProviderFactory::getPreferencePageID)//
            .filter(Predicate.not(String::isBlank))//
            .toArray(String[]::new);
        var dialog = PreferencesUtil.createPreferenceDialogOn(null, PREFERENCE_PAGE_ID, displayedIds, null);
        dialog.open();
        m_appStateProvider.updateAppState(); // Since changing the node recommendation settings changes the application state
        return null;
    }

}
