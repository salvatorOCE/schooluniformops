<?php
/**
 * WPCode Snippet: Add "Packed" order status to WooCommerce
 *
 * Use with WPCode (Code Snippets):
 * 1. Add new snippet → PHP Snippet
 * 2. Paste the code below (from the first add_action to the end of the second add_filter callback)
 * 3. Run everywhere (or "Run everywhere" / "Only run in admin")
 * 4. Activate
 *
 * This allows the Ops app to sync order status to "packed" via the WooCommerce API without 400 errors.
 */

// 1. Register the post status with WordPress
add_action('init', function () {
    register_post_status('wc-packed', [
        'label'                     => _x('Packed', 'Order status', 'woocommerce'),
        'public'                    => true,
        'exclude_from_search'       => false,
        'show_in_admin_all_list'    => true,
        'show_in_admin_status_list' => true,
        'label_count'               => _n_noop(
            'Packed <span class="count">(%s)</span>',
            'Packed <span class="count">(%s)</span>',
            'woocommerce'
        ),
    ]);
}, 10);

// 2. Add "Packed" to WooCommerce's list of order statuses (admin dropdown + API)
add_filter('wc_order_statuses', function ($order_statuses) {
    $order_statuses['wc-packed'] = _x('Packed', 'Order status', 'woocommerce');
    return $order_statuses;
}, 10, 1);
