require('dotenv').config({ path: '.env.local' });
const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;

const woo = new WooCommerceRestApi({
    url: process.env.WOO_URL,
    consumerKey: process.env.WOO_CONSUMER_KEY,
    consumerSecret: process.env.WOO_CONSUMER_SECRET,
    version: 'wc/v3'
});

async function test() {
    try {
        const response = await woo.get('orders', { per_page: 10 });
        const orders = response.data;
        orders.forEach(o => console.log(o.id, `SUS-${o.number}`, o.status, o.date_created, o.date_modified));
    } catch (e) {
        console.error("ERROR:", e.response ? e.response.data : e.message);
    }
}
test();
