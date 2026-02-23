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
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const afterDate = sevenDaysAgo.toISOString();

        console.log("After date:", afterDate);
        const response = await woo.get('orders', {
            after: afterDate,
            per_page: 100,
            order: 'asc'
        });

        const orders = response.data;
        console.log("Found raw orders:", orders.length);

        if (orders.length > 0) {
           console.log("First order example:", orders[0].id, orders[0].status);
        }

    } catch (e) {
        console.error("ERROR:", e.response ? e.response.data : e.message);
    }
}
test();
