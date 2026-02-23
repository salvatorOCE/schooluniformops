require('dotenv').config({ path: '.env.local' });
const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;
const woo = new WooCommerceRestApi({
    url: process.env.WOO_URL,
    consumerKey: process.env.WOO_CONSUMER_KEY,
    consumerSecret: process.env.WOO_CONSUMER_SECRET,
    version: 'wc/v3'
});

async function test() {
    const r = await woo.get('orders/19370922');
    console.log("Order 0189:", r.data.id, r.data.number, r.data.status, r.data.date_modified);
}
test();
