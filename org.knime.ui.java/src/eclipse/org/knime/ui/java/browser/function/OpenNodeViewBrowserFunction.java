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
 *   Nov 9, 2020 (hornm): created
 */
package org.knime.ui.java.browser.function;

import java.util.Arrays;

import org.eclipse.swt.chromium.Browser;
import org.eclipse.swt.chromium.BrowserFunction;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.workflow.NativeNodeContainer;
import org.knime.core.node.workflow.NodeContainer;
import org.knime.core.node.workflow.SubNodeContainer;
import org.knime.gateway.api.entity.NodeIDEnt;
import org.knime.gateway.impl.service.util.DefaultServiceUtil;
import org.knime.workbench.editor2.actions.OpenInteractiveWebViewAction;
import org.knime.workbench.editor2.actions.OpenSubnodeWebViewAction;

/**
 * Opens the node's view if available.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public class OpenNodeViewBrowserFunction extends BrowserFunction {

	private static final String FUNCTION_NAME = "openNodeView";

	public OpenNodeViewBrowserFunction(final Browser browser) {
		super(browser, FUNCTION_NAME);
	}

	/**
	 * {@inheritDoc}
	 */
	@Override
	public Object function(final Object[] args) { // NOSONAR
		if (args == null || args.length != 2 || !(args[0] instanceof String) || !(args[1] instanceof String)) {
			throw new IllegalArgumentException(
					"Wrong argument for browser function 'openNodeView'. The arguments are: " + Arrays.toString(args));
		}
		NodeContainer nc = DefaultServiceUtil.getNodeContainer((String) args[0], new NodeIDEnt((String) args[1]));
		if (nc == null) {
			NodeLogger.getLogger(OpenNodeViewBrowserFunction.class)
					.warn(String.format("Node with id '%s' not found in workflow with id '%s'", args[0], args[1]));
			return null;
		}

		if (nc.getInteractiveWebViews().size() > 0) {
			if (nc instanceof SubNodeContainer) {
				OpenSubnodeWebViewAction.openView((SubNodeContainer) nc);
				return null;
			} else if (nc instanceof NativeNodeContainer) {
				OpenInteractiveWebViewAction.openView((NativeNodeContainer) nc,
						nc.getInteractiveWebViews().get(0).getViewName());
				return null;
			} else {
				//
			}
		}
		NodeLogger.getLogger(OpenNodeViewBrowserFunction.class).warn(String
				.format("Node with id '%s' in workflow with id '%s' does not have a node view", args[0], args[1]));
		return null;
	}
}
