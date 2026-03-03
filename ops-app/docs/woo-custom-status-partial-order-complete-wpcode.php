<?php
/**
 * WPCode Snippet: Add "Packed" and "Partial Order Complete" order statuses to WooCommerce
 *
 * Use with WPCode (Code Snippets):
 * 1. Add new snippet → PHP Snippet
 * 2. Paste the code below (from the first add_action to the end of the last add_filter callback)
 * 3. Run everywhere (or "Run everywhere" / "Only run in admin")
 * 4. Activate
 *
 * - Packed: So the Ops app can sync "Packed" and Woo shows it instead of "Pending payment".
 * - Partial Order Complete: When some items have been sent; ops app tracks sent_quantity / partial_delivery.
 */

// 1. Register custom post statuses with WordPress
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

// 2. Add both statuses to WooCommerce's list (admin dropdown + API)
add_filter('wc_order_statuses', function ($order_statuses) {
    $order_statuses['wc-packed'] = _x('Packed', 'Order status', 'woocommerce');
    $order_statuses['wc-partial-order-complete'] = _x('Partial Order Complete', 'Order status', 'woocommerce');
    return $order_statuses;
}, 10, 1);
