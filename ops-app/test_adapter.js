// Polyfill fetch for node
if (!globalThis.fetch) {
  globalThis.fetch = require('node-fetch');
}
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

// We simulate what the adapter does
async function run() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const orderId = 'SUS-0193 (SEN)';
  const status = 'Completed';

  // 1. isUUID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
  console.log('isUUID:', isUUID);

  let actualId = orderId;
  if (!isUUID) {
    const { data, error } = await supabase.from('orders').select('id').eq('order_number', orderId).single();
    console.log('Lookup ID:', data, error);
    if (data) actualId = data.id;
  }

  console.log('Actual ID to sync:', actualId);

  const { data: order } = await supabase
    .from('orders')
    .select('woo_order_id')
    .eq('id', actualId)
    .single();

  console.log('Woo Order ID found:', order?.woo_order_id);

  // 2. We skip using the local API and call woo direct just to confirm
  const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;
  const woo = new WooCommerceRestApi({
    url: process.env.WOO_URL,
    consumerKey: process.env.WOO_CONSUMER_KEY,
    consumerSecret: process.env.WOO_CONSUMER_SECRET,
    version: 'wc/v3'
  });

  try {
    const updateRes = await woo.put(`orders/${order.woo_order_id}`, { status: 'completed' });
    console.log('Woo Update Success! new status:', updateRes.data.status);
  } catch (e) {
    console.log('Woo Update Failed API Call:', e.response?.data || e.message);
  }
}
run();
