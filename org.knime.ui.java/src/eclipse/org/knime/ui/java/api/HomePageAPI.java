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
 */
package org.knime.ui.java.api;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Predicate;
import java.util.regex.Pattern;

import org.knime.product.rcp.intro.WelcomeAPEndpoint;
import org.knime.product.rcp.intro.json.JSONCategory;
import org.knime.product.rcp.intro.json.JSONTile;
import org.knime.ui.java.profile.InternalUsageTracking;
import org.knime.ui.java.profile.UserProfile;

/**
 * Provide external content for the app home / entry page.
 *
 * @author Benjamin Moser, KNIME GmbH, Germany
 */
final class HomePageAPI {

    private static final TileId defaultTile = new TileId("c4-modern-ui", 0);

    private HomePageAPI() {
        // Stateless
    }

    /**
     * Get the contents of the single tile in the home page sidebar.
     *
     * @return A map/record with plain-text properties of title, image, text, button label and button link URL.
     *         {@code null} if absent.
     */
    @API(runInUIThread = false)
    static Map<String, String> getHomePageTile() {
        var endpoint = DesktopAPI.getDeps(WelcomeAPEndpoint.class);
        if (endpoint == null) {
            return null; // NOSONAR
        }
        var activeTileId = selectTile(endpoint, DesktopAPI.getDeps(UserProfile.class));
        return getTileContents(endpoint, activeTileId) //
            .map(HomePageAPI::tileToMap) //
            .orElse(null);
    }

    private static List<ConditionalCategory> getConditionalCategories(final WelcomeAPEndpoint endpoint) {
        return endpoint.getCategories(true, null).stream().flatMap(Arrays::stream).map(JSONCategory::getId)
            .flatMap(categoryId -> parseConditionalCategory(categoryId).stream()).toList();
    }

    private static final Pattern PARAMETERS = Pattern.compile("(\\w+)=([^,]+)"); // NOSONAR not expecting non-ascii input

    private static final Pattern SPLIT_PARAMETERS = Pattern.compile("--");

    /**
     * Given {@code foo--bar=13,qux=42}, yields map {@code bar->13, qux->42}
     */
    private static Map<String, String> parseParameters(final String input) {
        String[] parts = SPLIT_PARAMETERS.split(input);
        if (parts.length > 1) {
            Map<String, String> parameters = new HashMap<>();
            String parameterPart = parts[1];
            var matcher = PARAMETERS.matcher(parameterPart);
            while (matcher.find()) {
                String key = matcher.group(1);
                String value = matcher.group(2);
                parameters.put(key, value);
            }
            return parameters;
        }
        return Map.of();
    }

    static Optional<ConditionalCategory> parseConditionalCategory(final String categoryId) {
        var params = parseParameters(categoryId);
        if (params.isEmpty() || params.values().stream().anyMatch(s -> parseInt(s).isEmpty())) {
            return Optional.empty();
        }
        var predicate =
            params.entrySet().stream().map(entry -> parseParam(entry.getKey(), entry.getValue()))
                // careful: `x -> true` as identity only makes sense if case of empty stream is excluded above
                // (an empty stream would yield a true predicate)
                .reduce(x -> true, Predicate::and);
        return Optional.of(new ConditionalCategory(categoryId, predicate));
    }

    private static Predicate<InternalUsageTracking> parseParam(final String paramKey, final String paramValue) {
        if (paramKey.equals("startsLessEqualTo")) {
            return startsLessEqualTo(Integer.parseInt(paramValue));
        }
        if (paramKey.equals("startsGreaterThan")) {
            return startsGreaterThan(Integer.parseInt(paramValue));
        }
        throw new IllegalArgumentException("Not a number: " + paramValue);
    }

    private static Optional<Integer> parseInt(final String value) {
        try {
            return Optional.of(Integer.parseInt(value));
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }

    private static Optional<JSONTile> getTileContents(final WelcomeAPEndpoint endpoint, final TileId tile) {
        var tiles = endpoint.getCategories(true, null) //
            .stream() //
            .flatMap(Arrays::stream) //
            .filter(cat -> cat.getId().equals(tile.categoryId())) //
            .findFirst() //
            .map(JSONCategory::getTiles) //
            .orElse(List.of());
        try {
            return Optional.ofNullable(tiles.get(tile.index()));
        } catch (IndexOutOfBoundsException e) { // NOSONAR
            return Optional.empty();
        }
    }

    private static TileId selectTile(final WelcomeAPEndpoint endpoint, final UserProfile profile) {
        var usage = Optional.ofNullable(profile) //
            .map(UserProfile::internalUsageTracking); //
        if (usage.isEmpty()) {
            return defaultTile;
        }
        return getConditionalCategories(endpoint) //
            .stream().filter(conditionalCategory -> conditionalCategory.isActive().test(usage.get())) //
            .findFirst() //
            .map(conditionalCategory -> new TileId(conditionalCategory.id(), 0)) //
            .orElse(defaultTile);
    }

    private static Predicate<InternalUsageTracking> startsGreaterThan(final int numberOfStarts) {
        return usage -> usage.getTimesUiCreated() > numberOfStarts;
    }

    private static Predicate<InternalUsageTracking> startsLessEqualTo(final int numberOfStarts) {
        return usage -> usage.getTimesUiCreated() <= numberOfStarts;
    }

    private static Map<String, String> tileToMap(final JSONTile tile) {
        return Map.of( //
            "title", tile.getTitle(), //
            "image", tile.getImage(), //
            "text", tile.getText(), //
            "button-text", tile.getButtonText(), //
            "link", tile.getLink() //
        );
    }

    record ConditionalCategory(String id, Predicate<InternalUsageTracking> isActive) {

    }

    /**
     * Identifies a tile in the return JSON of the endpoint
     *
     * @param categoryId
     * @param index
     */
    private record TileId(String categoryId, int index) {

    }
}
