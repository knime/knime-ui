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
import java.net.URL;
import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.function.BiPredicate;

import org.knime.core.node.workflow.MetaNodeTemplateInformation.Role;
import org.knime.core.node.workflow.NodeID;
import org.knime.core.node.workflow.SubNodeContainer;
import org.knime.core.ui.util.SWTUtilities;
import org.knime.core.util.exception.ResourceAccessException;
import org.knime.core.util.hub.HubItemVersion;
import org.knime.core.util.pathresolve.ResolverUtil;
import org.knime.core.util.urlresolve.KnimeUrlResolver;
import org.knime.core.util.urlresolve.KnimeUrlResolver.KnimeUrlVariant;
import org.knime.core.util.urlresolve.URLResolverUtil;
import org.knime.gateway.api.service.GatewayException;
import org.knime.gateway.api.util.CoreUtil;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.OperationNotAllowedException;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.ServiceCallException;
import org.knime.gateway.impl.webui.WorkflowKey;
import org.knime.gateway.impl.webui.WorkflowMiddleware;
import org.knime.workbench.editor2.actions.ChangeComponentHubVersionDialog;
import org.knime.workbench.editor2.actions.ChangeSubNodeLinkAction;
import org.knime.workbench.editor2.commands.ChangeSubNodeLinkCommand;
import org.knime.workbench.editor2.commands.UpdateMetaNodeLinkCommand;

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

    static void openChangeComponentLinkTypeDialog(final SubNodeContainer component, final WorkflowKey wfKey)
        throws GatewayException {
        assertLinkedComponent(component, true);

        final var templateInfo = component.getTemplateInformation();
        final var sourceURI = templateInfo.getSourceURI();
        final var optLinkVariant = KnimeUrlVariant.getVariant(sourceURI);
        if (optLinkVariant.isEmpty()) {
            throw OperationNotAllowedException.builder() //
                .withTitle("Not a KNIME URL") //
                .withDetails("Only the type of KNIME URLs can be changed, found '" + sourceURI + "'.") //
                .canCopy(true) //
                .build();
        }

        final var linkVariant = optLinkVariant.get();
        final Map<KnimeUrlVariant, URL> changeOptions;
        try {
            final var context = CoreUtil.getProjectWorkflow(component).getContextV2();
            changeOptions = KnimeUrlResolver.getResolver(context) //
                .changeLinkType( //
                    URLResolverUtil.toURL(sourceURI), //
                    ResolverUtil::translateHubUrl //
                );
            if (changeOptions.size() <= (changeOptions.containsKey(linkVariant) ? 1 : 0)) {
                // there are no other options available
                return;
            }
        } catch (ResourceAccessException e) {
            throw new IllegalStateException("Cannot compute alternative KNIME URL types for '"
                    + sourceURI + "': " + e.getMessage(), e);
        }

        final var msg = String.format("""
                This is a linked (read-only) component. Only the link type can be changed.
                Please select the new type of the link to the shared component.
                (current type: %s, current link: %s)
                The origin of the component will not be changed - just the way it is referenced.
                """, linkVariant.getDescription(), sourceURI);

        final var shell = SWTUtilities.getActiveShell();
        final var newUri = ChangeSubNodeLinkAction.showDialogAndGetUri(shell, sourceURI, linkVariant, msg,
            changeOptions);
        if (newUri.isPresent()) {
            final var workflowMiddleware = DesktopAPI.getDeps(WorkflowMiddleware.class);
            final var cmd = workflowMiddleware.getCommands();
            cmd.setCommandToExecute(getChangeSubNodeLinkCommand(component, sourceURI, newUri.get(), false));
            cmd.execute(wfKey, null);
        }
    }

    /**
     * This will not be callable from the FE until NXT-2038 is solved.
     * @throws GatewayException
     */
    static void openChangeComponentHubItemVersionDialog(final SubNodeContainer component, final WorkflowKey wfKey)
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
        final var currentVersion = HubItemVersion.of(srcUri).orElse(HubItemVersion.currentState());
        final var targetVersion = dialog.getSelectedVersion();
        if (Objects.equals(targetVersion, currentVersion)) {
            return;
        }

        final var newSrcUri = targetVersion.applyTo(srcUri);
        final var workflowMiddleware = DesktopAPI.getDeps(WorkflowMiddleware.class);
        final var cmd = workflowMiddleware.getCommands();
        cmd.setCommandToExecute(getChangeSubNodeLinkCommand(component, srcUri, newSrcUri, true));
        cmd.execute(wfKey, null);

        // ChangeComponentHubVersionCommand does not check canExecute of the actual update command
        cmd.setCommandToExecute(getUpdateComponentCommand(component));
        try {
            cmd.execute(wfKey, null);
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

    /**
     * @deprecated See NXT-2173
     */
    @Deprecated
    private static WorkflowCommandAdapter getUpdateComponentCommand(final SubNodeContainer component) {
        final var componentID = component.getID();
        final var wfm = component.getParent();
        final var updateComponentCommand = new UpdateMetaNodeLinkCommand(wfm, new NodeID[]{componentID});
        return new WorkflowCommandAdapter(updateComponentCommand, false);
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
