package org.knime.ui.java.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.knime.product.rcp.intro.ProductHints;
import org.knime.product.rcp.intro.json.JSONCategory;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

public class HomePageAPITest {

    @Test
    public void testGetHomePageTile() throws JsonProcessingException {
        var json = "[{\"category-id\":\"c1-news\",\"category-title\":\"C1 - News\",\"category-text\":null,\"tiles\":[{\"tile-title\":\"How to scale analytics upskilling: the flywheel effect\",\"tile-tag\":\"Blog\",\"tile-image\":\"https:\\/\\/www.knime.com\\/sites\\/default\\/files\\/2023-07\\/upskilling-flywheel-header.jpg\",\"tile-text\":\"Read about the key elements of the data science upskilling flywheel that scale analytics adoption across the organization.\",\"tile-button-text\":\"Read more\",\"tile-link\":\"https:\\/\\/www.knime.com\\/blog\\/how-to-scale-analytics-upskilling-the-flywheel-effect?utm_source=knimeapp\"},{\"tile-title\":\"How to Use Python Script Node in Production Environments\",\"tile-tag\":\"Blog\",\"tile-image\":\"https:\\/\\/www.knime.com\\/sites\\/default\\/files\\/2023-07\\/python-script-node-v-4-7.jpg\",\"tile-text\":\"How to use Python Script in KNIME -- with increased performance plus bundled environments to get started quickly.\",\"tile-button-text\":\"Read more\",\"tile-link\":\"https:\\/\\/www.knime.com\\/blog\\/python-script-node-bundled-packages?utm_source=knimeapp\"},{\"tile-title\":\"How to deploy an analytical model in minutes\",\"tile-tag\":\"Blog\",\"tile-image\":\"https:\\/\\/www.knime.com\\/sites\\/default\\/files\\/2023-06\\/how-to-deploy-models-in-minutes_0.jpg\",\"tile-text\":\"The majority of data teams are using ad-hoc processes for ModelOps. Learn how your team can set up a process for the continuous delivery of data science (CDDS).\",\"tile-button-text\":\"Read more\",\"tile-link\":\"https:\\/\\/www.knime.com\\/blog\\/modelops-how-to-continuously-deploy-data-science?utm_source=knimeapp\"}]},{\"category-id\":\"c2-learning\",\"category-title\":\"C2 - Learning\",\"category-text\":null,\"tiles\":[{\"tile-title\":\"Add new calculated column\",\"tile-tag\":\"Tips \\u0026 Tricks\",\"tile-image\":\"https:\\/\\/www.knime.com\\/sites\\/default\\/files\\/2019-11\\/calculate-column_0.svg\",\"tile-text\":\"You can apply math functions with the \\u0022Math Formula\\u0022 node and append the result as a new column.\",\"tile-button-text\":\"Learn more\",\"tile-link\":\"https:\\/\\/hub.knime.com\\/knime\\/spaces\\/Examples\\/latest\\/02_ETL_Data_Manipulation\\/04_Transformation\\/02_StringManipulation_MathFormula_RuleEngine?utm_source=knimeapp\"},{\"tile-title\":\"What day is today?\",\"tile-tag\":\"Tips \\u0026 Tricks\",\"tile-image\":\"https:\\/\\/www.knime.com\\/sites\\/default\\/files\\/2019-11\\/today_0.svg\",\"tile-text\":\"Use the \\u0022Create Date\\u0026Time Range\\u0022 node and tick \\u0022Execution date\\u0026time\\u0022 to insert current date and time.\",\"tile-button-text\":\"Learn more\",\"tile-link\":\"https:\\/\\/hub.knime.com\\/knime\\/extensions\\/org.knime.features.base\\/latest\\/org.knime.time.node.create.createdatetime.CreateDateTimeNodeFactory?utm_source=knimeapp\"},{\"tile-title\":\"Remove missing values\",\"tile-tag\":\"Tips \\u0026 Tricks\",\"tile-image\":\"https:\\/\\/www.knime.com\\/sites\\/default\\/files\\/2019-11\\/remove-missing_0.svg\",\"tile-text\":\"To clean a table of all rows with missing values use the \\u0022Missing Value\\u0022 node with the \\u0022Remove Row\\u0022 option.\",\"tile-button-text\":\"Learn more\",\"tile-link\":\"https:\\/\\/hub.knime.com\\/knime\\/spaces\\/Examples\\/latest\\/02_ETL_Data_Manipulation\\/04_Transformation\\/01_Handling_Missing_Values?utm_source=knimeapp\"}]},{\"category-id\":\"c3-events-promotions\",\"category-title\":\"C3 - Events \\u0026 Promotions\",\"category-text\":null,\"tiles\":[{\"tile-title\":\"KNIME DataHop Frankfurt\",\"tile-tag\":\"Events\",\"tile-image\":\"https:\\/\\/www.knime.com\\/sites\\/default\\/files\\/2024-06\\/Screenshot%202024-06-11%20at%2016.19.36.png\",\"tile-text\":\"DataHop is KNIME\\u2019s roadshow event series. Join us in Frankfurt to hear best practices for working with data, learn about low-code\\/no-code data science with KNIME, and expand your network by connecting with industry peers and experts.\",\"tile-button-text\":\"Register\",\"tile-link\":\"https:\\/\\/info.knime.com\\/datahop-frankfurt-2024?utm_source=knimeapp\\u0026utm_medium=organic\\u0026utm_term=\\u0026utm_content=event\\u0026utm_campaign=brand\"}]}]";
        var categories = Optional.of(new ObjectMapper().readValue(json, JSONCategory[].class));
        DesktopAPI.injectDependencies(null, null, null, null, null, null, null, null, null, null,
            new ProductHints(List.of(() -> categories)));

        var actual = HomePageAPI.getHomePageTile();

        // asserts that the correct item is picked
        assertThat(actual.get("title")).isEqualTo("KNIME DataHop Frankfurt");
    }

}
