const cheerio = require('cheerio');
const Scraper = require('./se_scraper');

class AmazonScraper extends Scraper {

    constructor(...args) {
        super(...args);
    }

    parse(html) {
        // load the page source into cheerio
        const $ = cheerio.load(html);

        // perform queries
        const results = [];
        $('#search .s-result-item').each((i, product) => {
            //TODO: this is absolute horrible, but so is parsing html

            let resobj = {};
            try {
                resobj.image = $(product).find('[data-component-type="s-product-image"] a').attr('href');
            } catch (err) {
            }

            try {
                resobj.seller = $(product).find('h5 + div span').text();
            } catch (err) {
            }

            try {
                resobj.link = $(product).find('a.a-link-normal').attr('href');
            } catch (err) {
            }

            try {
                resobj.title = $(product).find('a.a-link-normal .a-text-normal').text();
            } catch (err) {
            }

            try {
                resobj.stars = $(product).find('a i span').text();
            } catch (err) {
            }

            try {
                resobj.num_reviews = $(product).find('span > a > span:first-child').text();
            } catch (err) {
            }

            try {
                resobj.price = $(product).find('.a-price .a-offscreen').text();
            } catch (err) {
            }

            try {
                resobj.oldprice = $(product).find('.a-price[data-a-color="secondary"]').text();
            } catch (err) {
            }
            results.push(resobj);
        });

        let no_results = this.no_results(
            ['Keine Ergebnisse', 'No results for '],
            $('#search').text()
        );

        let effective_query = $('[data-component-type="s-result-info-bar"] span.a-text-bold').text() || '';

        const cleaned = this.clean_results(results, ['title', 'link', 'price', 'stars']);

        return {
            time: (new Date()).toUTCString(),
            num_results: $('[data-component-type="s-result-info-bar"] .a-spacing-top-small').text(),
            no_results: no_results,
            effective_query: effective_query,
            results: cleaned
        }
    }

    async load_start_page() {
        let startUrl = 'https://www.amazon.com/';

        if (this.config.amazon_settings) {
            startUrl = `https://www.${this.config.amazon_settings.amazon_domain}/s?`;
            if (this.config.amazon_settings.amazon_domain) {
                startUrl = `https://www.${this.config.amazon_settings.amazon_domain}/s?`;
            } else {
                startUrl = 'https://www.amazon.com/s?';
            }

            for (var key in this.config.amazon_settings) {
                if (key !== 'amazon_domain') {
                    startUrl += `${key}=${this.config.amazon_settings[key]}&`
                }
            }
        }

        if (this.config.verbose) {
            console.log('Using startUrl: ' + startUrl);
        }

        this.last_response = await this.page.goto(startUrl);

        try {
            await this.page.waitForSelector('input[name="field-keywords"]', { timeout: this.STANDARD_TIMEOUT });
        } catch (e) {
            return false;
        }

        return true;
    }

    async search_keyword(keyword) {
        const input = await this.page.$('input[name="field-keywords"]');
        await this.set_input_value(`input[name="field-keywords"]`, keyword);
        await this.sleep(50);
        await input.focus();
        await this.page.keyboard.press("Enter");
    }

    async next_page() {
        let next_page_link = await this.page.$('.a-last a', {timeout: 1000});
        if (!next_page_link) {
            return false;
        }
        await next_page_link.click();

        return true;
    }

    async wait_for_results() {
        await this.page.waitForSelector('.s-result-list', { timeout: this.STANDARD_TIMEOUT });
    }

    async detected() {
        const title = await this.page.title();
        let html = await this.page.content();
        return html.indexOf('detected unusual traffic') !== -1 || title.indexOf('/sorry/') !== -1;
    }
}


module.exports = {
    AmazonScraper: AmazonScraper,
};