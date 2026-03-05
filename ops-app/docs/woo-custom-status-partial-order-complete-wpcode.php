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
 * IMPORTANT: Status slugs must be 20 characters or less (including "wc-").
 * Using "wc-partial-order-complete" (23 chars) causes orders to vanish from the admin list.
 * We use "wc-partial-complete" (18 chars) so the orders list displays correctly.
 *
 * - Packed: So the Ops app can sync "Packed" and Woo shows it instead of "Pending payment".
 * - Partial Order Complete: When some items have been sent; ops app tracks sent_quantity / partial_delivery.
 *   REST API slug: partial-complete (ops app sends this).
 *
 * The ops app syncs "Partially Complete" to WooCommerce by default. To disable that sync, set
 * WOO_ALLOW_PARTIAL_ORDER_COMPLETE_SYNC=false in the ops app environment.
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

    // Slug must be ≤20 chars (incl. wc-) or orders disappear from admin list. Use wc-partial-complete (18 chars).
    register_post_status('wc-partial-complete', [
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
    $order_statuses['wc-partial-complete'] = _x('Partial Order Complete', 'Order status', 'woocommerce');
    return $order_statuses;
}, 10, 1);
