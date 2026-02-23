require('dotenv').config({ path: '.env.local' });
const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;
const woo = new WooCommerceRestApi({
    url: process.env.WOO_URL,
    consumerKey: process.env.WOO_CONSUMER_KEY,
    consumerSecret: process.env.WOO_CONSUMER_SECRET,
    version: 'wc/v3'
});
(async()=>{
    const r = await woo.get('orders', { per_page: 7 });
    r.data.forEach(o => console.log(`ID:${o.id} number:"${o.number}" status:"${o.status}"`));
})();
