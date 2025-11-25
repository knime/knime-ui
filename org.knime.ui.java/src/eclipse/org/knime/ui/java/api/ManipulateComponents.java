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
 *   Sep 7, 2023 (kai): created
 */
package org.knime.ui.java.api;

import java.net.URI;
import java.net.URISyntaxException;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.function.BiPredicate;

import org.knime.core.node.workflow.MetaNodeTemplateInformation.Role;
import org.knime.core.node.workflow.SubNodeContainer;
import org.knime.core.ui.util.SWTUtilities;
import org.knime.core.util.hub.ItemVersion;
import org.knime.core.util.urlresolve.URLResolverUtil;
import org.knime.gateway.api.entity.EntityBuilderManager;
import org.knime.gateway.api.entity.NodeIDEnt;
import org.knime.gateway.api.service.GatewayException;
import org.knime.gateway.api.webui.entity.UpdateLinkedComponentsCommandEnt.UpdateLinkedComponentsCommandEntBuilder;
import org.knime.gateway.api.webui.entity.WorkflowCommandEnt.KindEnum;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.OperationNotAllowedException;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.ServiceCallException;
import org.knime.gateway.impl.webui.WorkflowKey;
import org.knime.gateway.impl.webui.WorkflowMiddleware;
import org.knime.workbench.editor2.actions.ChangeComponentHubVersionDialog;
import org.knime.workbench.editor2.commands.ChangeSubNodeLinkCommand;

/**
 * Helper methods to operate on components
 *
 * @author Manuel Hotz, KNIME GmbH, Konstanz, Germany
 * @author Kai Franze, KNIME GmbH, Germany
 */
@SuppressWarnings("restriction")
final class ManipulateComponents {

    private ManipulateComponents() {
        // Stateless
    }

    /**
     * This will not be callable from the FE until NXT-2038 is solved.
     * @throws GatewayException
     */
    static void openChangeComponentItemVersionDialog(final SubNodeContainer component, final WorkflowKey wfKey)
        throws GatewayException {
        assertLinkedComponent(component, true);

        // WorkflowEntityFactory#isHubItemVersionChangeable disables the action for non-Hub items,
        // so we assume that the call is fine

        final var shell = SWTUtilities.getActiveShell();
        final var wfm = component.getParent();
        final var dialog = new ChangeComponentHubVersionDialog(shell, component, wfm);
        if (dialog.open() != 0) {
            return;
        }

        final var srcUri = component.getTemplateInformation().getSourceURI();
        final var currentVersion = URLResolverUtil.parseVersion(srcUri.getQuery()).orElseGet(ItemVersion::currentState);
        final var targetVersion = dialog.getSelectedVersion();
        if (Objects.equals(targetVersion, currentVersion)) {
            return;
        }

        // (1) Change URI to new version.
        final var workflowMiddleware = DesktopAPI.getDeps(WorkflowMiddleware.class);
        final var cmd = workflowMiddleware.getCommands();
        try {
            final var newSrcUri = URLResolverUtil.applyTo(targetVersion, srcUri);
            cmd.setCommandToExecute(getChangeSubNodeLinkCommand(component, srcUri, newSrcUri, true));
            cmd.execute(wfKey, null);
        } catch (URISyntaxException e) {
            throw ServiceCallException.builder() //
                .withTitle("Unable to construct new URI for component") //
                .withDetails("The component %s is linked to <%s>, ".formatted(component.getNameWithID(), srcUri) //
                    + "from which it is currently impossible to construct a new, versioned URI.") //
                .canCopy(true) //
                .withCause(e) //
                .build();
        }

        // (2) Perform component update to fetch its info.
        final var cmdEnt = EntityBuilderManager.builder(UpdateLinkedComponentsCommandEntBuilder.class) //
            .setKind(KindEnum.UPDATE_LINKED_COMPONENTS) //
            .setNodeIds(List.of(new NodeIDEnt(component.getID()))) //
            .build();
        try {
            cmd.execute(wfKey, cmdEnt);
        } catch (final ServiceCallException e) {
            // undo setLink if we could not update the component
            cmd.undo(wfKey);
            throw e;
        }
    }

    private static void assertLinkedComponent(final SubNodeContainer component, final boolean isLinked)
        throws OperationNotAllowedException {
        final BiPredicate<Role, Role> predicate = (left, right) -> isLinked ? (left == right) : (left != right);
        if (!predicate.test(component.getTemplateInformation().getRole(), Role.Link)) {
            throw OperationNotAllowedException.builder() //
                .withTitle("Component in unexpected state") //
                .withDetails(
                    "The component %s is %slinked.".formatted(component.getNameWithID(), isLinked ? "not " : "")) //
                .canCopy(false) //
                .build();
        }
    }

    private static WorkflowCommandAdapter getChangeSubNodeLinkCommand(final SubNodeContainer component,
        final URI oldLink, final URI newLink, final boolean resetLastModified) {
        final var wfm = component.getParent();
        final var oldTimestamp = resetLastModified ? component.getTemplateInformation().getTimestampInstant() : null;
        final var newTimestamp = resetLastModified ? Instant.EPOCH : null;
        final var linkCmd = new ChangeSubNodeLinkCommand(wfm, component, oldLink, oldTimestamp, newLink, newTimestamp);
        return new WorkflowCommandAdapter(linkCmd, true);
    }

}
