<?php
/**
 * WPCode Snippet: Add "Partial Order Complete" order status to WooCommerce
 *
 * Use with WPCode (Code Snippets):
 * 1. Add new snippet → PHP Snippet
 * 2. Paste the code below (from the first add_action to the end of the second add_filter callback)
 * 3. Run everywhere (or "Run everywhere" / "Only run in admin")
 * 4. Activate
 *
 * This allows the Ops app to set orders to "Partial Order Complete" when some items
 * have been sent and the rest will be fulfilled later. The ops app tracks which
 * line items have been sent via sent_quantity / partial_delivery.
 */

// 1. Register the post status with WordPress
add_action('init', function () {
    register_post_status('wc-partial-order-complete', [
        'label'                     => _x('Partial Order Complete', 'Order status', 'woocommerce'),
        'public'                    => true,
        'exclude_from_search'       => false,
        'show_in_admin_all_list'    => true,
        'show_in_admin_status_list' => true,
        'label_count'               => _n_noop(
            'Partial Order Complete <span class="count">(%s)</span>',
            'Partial Order Complete <span class="count">(%s)</span>',
            'woocommerce'
        ),
    ]);
}, 10);

// 2. Add "Partial Order Complete" to WooCommerce's list of order statuses (admin dropdown + API)
add_filter('wc_order_statuses', function ($order_statuses) {
    $order_statuses['wc-partial-order-complete'] = _x('Partial Order Complete', 'Order status', 'woocommerce');
    return $order_statuses;
}, 10, 1);
