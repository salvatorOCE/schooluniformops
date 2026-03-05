<?php
/**
 * WPCode Snippet: Add "Partial Order Complete" order status to WooCommerce (standalone)
 *
 * Use with WPCode (Code Snippets):
 * 1. Add new snippet → PHP Snippet (or replace your existing Partial Order Complete snippet)
 * 2. Paste the code below
 * 3. Run everywhere
 * 4. Activate
 *
 * IMPORTANT: The slug must be 20 characters or less (including "wc-").
 * "wc-partial-order-complete" (23 chars) causes orders to disappear from the admin list.
 * This uses "wc-partial-complete" (18 chars) so orders stay visible.
 *
 * The ops app sends status "partial-complete" when you mark an order as Partially Complete.
 */

add_action('init', function () {
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

add_filter('wc_order_statuses', function ($order_statuses) {
    $order_statuses['wc-partial-complete'] = _x('Partial Order Complete', 'Order status', 'woocommerce');
    return $order_statuses;
}, 10, 1);
