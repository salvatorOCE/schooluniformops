const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;

const woo = new WooCommerceRestApi({
    url: process.env.WOO_URL,
    consumerKey: process.env.WOO_CONSUMER_KEY,
    consumerSecret: process.env.WOO_CONSUMER_SECRET,
    version: 'wc/v3'
});

async function test() {
    try {
        const response = await woo.get('orders', { per_page: 5 });
        console.log(JSON.stringify(response.data.map(o => ({ id: o.id, number: o.number, status: o.status, date_created: o.date_created })), null, 2));
    } catch (e) {
        console.error("ERROR:", e.response ? e.response.data : e.message);
    }
}
test();
