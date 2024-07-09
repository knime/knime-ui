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
 *   Jul 9, 2023 (hornm): created
 */
package org.knime.ui.java.util;

import static org.knime.ui.java.api.DesktopAPI.MAPPER;

import java.util.function.Predicate;

import org.knime.gateway.api.webui.entity.SpaceProviderEnt.TypeEnum;
import org.knime.gateway.impl.webui.service.events.EventConsumer;
import org.knime.gateway.impl.webui.spaces.SpaceProvider;
import org.knime.gateway.impl.webui.spaces.SpaceProvider.SpaceProviderConnection;
import org.knime.gateway.impl.webui.spaces.SpaceProviders;

import com.fasterxml.jackson.databind.node.ObjectNode;

/**
 * Utilities around {@link SpaceProviders}
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 * @author Kai Franze, KNIME GmbH, Germany
 */
public final class SpaceProvidersUtil {

    private SpaceProvidersUtil() {
        // Utility class
    }

    /**
     * Gets the space provides, composes them into an event and passed it to the given event consumer.
     *
     * @param spaceProviders
     * @param eventConsumer
     */
    public static void sendSpaceProvidersChangedEvent(final SpaceProviders spaceProviders,
        final EventConsumer eventConsumer) {
        final var result = MAPPER.createObjectNode();
        Object res;
        try {
            spaceProviders.getProvidersMap().values().forEach(sp -> {
                result.set(sp.getId(), buildSpaceProviderObjectNode(sp, false));
            });
            res = MAPPER.createObjectNode().set("result", result);
        } catch (Throwable t) { // NOSONAR
            res = MAPPER.createObjectNode().put("error", t.getMessage());
        }
        eventConsumer.accept("SpaceProvidersChangedEvent", res);
    }

    /**
     * Build the space provider object optionally connecting to the space provider first.
     *
     * @param spaceProvider
     * @param doConnect
     *
     * @return The complete space provider object,
     */
    public static ObjectNode buildSpaceProviderObjectNode(final SpaceProvider spaceProvider, final boolean doConnect) {
        final var type = spaceProvider.getType();
        final var isLocalSpaceProvider = type == TypeEnum.LOCAL;
        final var connectionMode = isLocalSpaceProvider ? "AUTOMATIC" : "AUTHENTICATED";
        final var userObjectNode = buildUserObjectNode(spaceProvider, doConnect); // To connect if necessary
        final var spaceProviderObjectNode = MAPPER.createObjectNode()//
            .put("id", spaceProvider.getId()) //
            .put("name", spaceProvider.getName()) //
            .put("type", type.toString()) //
            .put("connected", isLocalSpaceProvider || spaceProvider.getConnection(false).isPresent()) //
            .put("connectionMode", connectionMode) //
            .put("hostname", isLocalSpaceProvider ? null
                : spaceProvider.getServerAddress().orElse(null));
        if (!isLocalSpaceProvider) { // Do not set user object node in local space
            spaceProviderObjectNode.set("user", userObjectNode);
        }
        return spaceProviderObjectNode;
    }

    /**
     * @return The user object node if connection present {@code null} otherwise.
     */
    private static ObjectNode buildUserObjectNode(final SpaceProvider spaceProvider, final boolean doConnect) {
        return spaceProvider.getConnection(doConnect)//
            .map(SpaceProviderConnection::getUsername)//
            .filter(Predicate.not(String::isEmpty))//
            .map(userName -> MAPPER.createObjectNode().putObject("user").put("name", userName))//
            .orElse(null);
    }
}
