const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const woo = new WooCommerceRestApi({
    url: process.env.WOO_URL,
    consumerKey: process.env.WOO_CONSUMER_KEY,
    consumerSecret: process.env.WOO_CONSUMER_SECRET,
    version: 'wc/v3'
});

async function run() {
    for (const id of [19370210, 19370445, 19370472, 19370473]) {
        try {
            console.log("Fetching order:", id);
            await woo.get(`orders/${id}`);
            console.log(`Order ${id} found!`);
        } catch (err) {
            console.log(`ERROR fetching ${id}:`, err.response?.data || err.message);
        }
    }
}
run();
