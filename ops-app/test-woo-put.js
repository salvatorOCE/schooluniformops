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
        const response = await woo.put('orders/19370924', { status: 'wc-embroidery' });
        console.log("Success:", response.data.status);
    } catch (e) {
        console.error("ERROR:", e.response ? e.response.data : e.message);
    }
}
test();
