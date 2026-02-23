require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;

const woo = new WooCommerceRestApi({
    url: process.env.WOO_URL,
    consumerKey: process.env.WOO_CONSUMER_KEY,
    consumerSecret: process.env.WOO_CONSUMER_SECRET,
    version: 'wc/v3'
});

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
    try {
        const response = await woo.get('orders', { per_page: 1 });
        const order = response.data[0];

        console.log("Got order:", order.id);

        const studentName = order.shipping?.first_name
            ? `${order.shipping.first_name} ${order.shipping.last_name}`.trim()
            : `${order.billing?.first_name} ${order.billing?.last_name}`.trim();

        const parentName = `${order.billing?.first_name} ${order.billing?.last_name}`.trim();

        const payload = {
            woo_order_id: order.id,
            order_number: `SUS ${order.number}`,
            status: 'IMPORTED',
            delivery_method: 'HOME',
            student_name: studentName,
            customer_name: parentName,
        };

        console.log("Payload:", payload);

        const { data, error } = await supabaseAdmin
            .from('orders')
            .upsert(payload, { onConflict: 'woo_order_id' })
            .select()
            .single();

        if (error) {
            console.error("UPSERT ERROR:", error);
        } else {
            console.log("UPSERT SUCCESS:", data.id);
        }

    } catch (e) {
        console.error("ERROR:", e);
    }
}
test();
