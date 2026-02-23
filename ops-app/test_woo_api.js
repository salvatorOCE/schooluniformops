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
    try {
        console.log("Fetching order 19370926...");
        const res = await woo.get('orders/19370926');
        console.log("Order found! Current status:", res.data.status);

        console.log("Attempting to update status to 'completed'...");
        const updateRes = await woo.put('orders/19370926', { status: 'completed' });
        console.log("Update success! New status:", updateRes.data.status);
    } catch (err) {
        console.log('ERROR:', err.response?.data || err.message);
    }
}
run();
