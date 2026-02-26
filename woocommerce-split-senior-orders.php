<?php
/**
 * School Uniform Solutions: Split mixed orders (senior vs normal) at checkout.
 * Paste this into WPCode or your theme's functions.php / a small plugin.
 * Reliable: correct email key, no double stock reduction, safety checks.
 */

defined( 'ABSPATH' ) || exit;

add_action( 'woocommerce_checkout_order_processed', 'sus_split_mixed_orders', 20, 3 );

function sus_split_mixed_orders( $order_id, $posted_data, $order ) {
	if ( ! $order_id || ! $order || ! is_a( $order, 'WC_Order' ) ) {
		return;
	}

	$senior_keywords = array( 'senior', 'year 6', 'yr 6' );
	$senior_items   = array();
	$normal_items   = array();

	foreach ( $order->get_items() as $item_id => $item ) {
		if ( ! is_a( $item, 'WC_Order_Item_Product' ) ) {
			continue;
		}
		$name     = strtolower( $item->get_name() );
		$is_senior = false;
		foreach ( $senior_keywords as $keyword ) {
			if ( strpos( $name, $keyword ) !== false ) {
				$is_senior = true;
				break;
			}
		}
		if ( $is_senior ) {
			$senior_items[] = $item;
		} else {
			$normal_items[] = $item;
		}
	}

	if ( empty( $senior_items ) || empty( $normal_items ) ) {
		return;
	}

	// Create senior order and copy address/payment
	$senior_order = wc_create_order( array( 'customer_id' => $order->get_customer_id() ) );
	if ( ! $senior_order || ! is_a( $senior_order, 'WC_Order' ) ) {
		$order->add_order_note( 'Split order failed: could not create senior order.' );
		$order->save();
		return;
	}

	$fields = array(
		'billing_first_name', 'billing_last_name', 'billing_email', 'billing_phone',
		'billing_address_1', 'billing_address_2', 'billing_city', 'billing_postcode', 'billing_state', 'billing_country',
		'shipping_first_name', 'shipping_last_name', 'shipping_address_1', 'shipping_address_2',
		'shipping_city', 'shipping_postcode', 'shipping_state', 'shipping_country',
	);
	foreach ( $fields as $field ) {
		$setter = 'set_' . $field;
		$getter = 'get_' . $field;
		if ( method_exists( $senior_order, $setter ) && method_exists( $order, $getter ) ) {
			$senior_order->$setter( $order->$getter() );
		}
	}
	$senior_order->set_payment_method( $order->get_payment_method() );
	$senior_order->set_payment_method_title( $order->get_payment_method_title() );

	// Restore stock for senior items on the ORIGINAL order before moving (avoids double reduction)
	foreach ( $senior_items as $item ) {
		$product = $item->get_product();
		if ( ! $product || ! $product->managing_stock() ) {
			continue;
		}
		$qty = $item->get_quantity();
		if ( $qty > 0 ) {
			$product->increase_stock( $qty );
		}
	}

	// Add senior items to new order and remove from original
	foreach ( $senior_items as $item ) {
		$product = $item->get_product();
		if ( ! $product ) {
			continue;
		}
		$senior_order->add_product(
			$product,
			$item->get_quantity(),
			array(
				'totals' => array(
					'subtotal'     => $item->get_subtotal(),
					'subtotal_tax' => $item->get_subtotal_tax(),
					'total'        => $item->get_total(),
					'total_tax'    => $item->get_total_tax(),
				),
			)
		);
		$order->remove_item( $item->get_id() );
	}

	$order->calculate_totals();
	$order->add_order_note( 'Senior items moved to Order #' . $senior_order->get_id() );
	$order->save();

	$senior_order->calculate_totals();
	$senior_order->set_status( 'processing', 'Split from Order #' . $order_id );
	$senior_order->save();

	update_post_meta( $order_id, '_split_senior_order_id', $senior_order->get_id() );

	// Trigger processing email using correct WooCommerce email ID
	$mailer = WC()->mailer();
	if ( $mailer ) {
		$emails = $mailer->get_emails();
		if ( isset( $emails['customer_processing_order'] ) && is_object( $emails['customer_processing_order'] ) ) {
			$emails['customer_processing_order']->trigger( $senior_order->get_id() );
		}
	}
}

// Thank-you page: show senior order card
add_action( 'wp_footer', 'sus_render_senior_card' );

function sus_render_senior_card() {
	if ( ! function_exists( 'is_checkout' ) || ! is_checkout() ) {
		return;
	}
	global $wp;
	if ( ! isset( $wp->query_vars['order-received'] ) ) {
		return;
	}
	$oid = absint( $wp->query_vars['order-received'] );
	if ( ! $oid ) {
		return;
	}
	$sid = get_post_meta( $oid, '_split_senior_order_id', true );
	if ( ! $sid ) {
		return;
	}
	$so = wc_get_order( $sid );
	if ( ! $so || ! is_a( $so, 'WC_Order' ) ) {
		return;
	}

	$num   = esc_html( $so->get_order_number() );
	$date  = $so->get_date_created() ? esc_html( $so->get_date_created()->date_i18n( 'j F, Y' ) ) : '';
	$email = esc_html( $so->get_billing_email() );
	$total_raw = $so->get_formatted_order_total();
	$pay   = esc_html( $so->get_payment_method_title() );

	echo '<div id="sus-senior-card">';
	echo '<div style="border:2px solid #10b981;border-radius:12px;background:#f0fdf4;padding:20px;margin-bottom:24px;">';
	echo '<p style="color:#047857;margin:0 0 16px;font-size:0.9em;font-weight:600;">Senior Uniform Order — These items will be prepared for the school deadline.</p>';
	echo '<ul class="woocommerce-order-overview woocommerce-thankyou-order-details order_details">';
	echo '<li class="woocommerce-order-overview__order order">Order number: <strong>' . $num . '</strong></li>';
	echo '<li class="woocommerce-order-overview__date date">Date: <strong>' . $date . '</strong></li>';
	echo '<li class="woocommerce-order-overview__email email">Email: <strong>' . $email . '</strong></li>';
	echo '<li class="woocommerce-order-overview__total total">Total: <strong>' . $total_raw . '</strong></li>';
	echo '<li class="woocommerce-order-overview__payment-method method">Payment method: <strong>' . $pay . '</strong></li>';
	echo '</ul>';
	echo '<section class="woocommerce-order-details">';
	echo '<h2 class="woocommerce-order-details__title">Order details</h2>';
	echo '<table class="woocommerce-table woocommerce-table--order-details shop_table order_details">';
	echo '<thead><tr><th class="woocommerce-table__product-name product-name">Product</th><th class="woocommerce-table__product-table product-total">Total</th></tr></thead>';
	echo '<tbody>';
	foreach ( $so->get_items() as $item ) {
		$pid = $item->get_product_id();
		$plink = $pid ? get_permalink( $pid ) : '#';
		echo '<tr class="woocommerce-table__line-item order_item">';
		echo '<td class="woocommerce-table__product-name product-name"><a href="' . esc_url( $plink ) . '">' . esc_html( $item->get_name() ) . '</a> <strong class="product-quantity">&times;&nbsp;' . esc_html( $item->get_quantity() ) . '</strong></td>';
		echo '<td class="woocommerce-table__product-total product-total">' . wc_price( $item->get_total() ) . '</td>';
		echo '</tr>';
	}
	echo '</tbody>';
	echo '<tfoot>';
	echo '<tr><th scope="row">Subtotal:</th><td>' . wc_price( $so->get_subtotal() ) . '</td></tr>';
	echo '<tr><th scope="row">Shipping:</th><td>Pickup from school</td></tr>';
	echo '<tr><th scope="row">Total:</th><td>' . $total_raw . '</td></tr>';
	echo '<tr><th scope="row">Payment method:</th><td>' . $pay . '</td></tr>';
	echo '</tfoot>';
	echo '</table></section>';
	echo '</div></div>';
	echo '<script>';
	echo 'setTimeout(function(){';
	echo 'var card=document.getElementById("sus-senior-card");';
	echo 'if(!card)return;';
	echo 'var headings=document.querySelectorAll("h2,h3,h4");';
	echo 'for(var i=0;i<headings.length;i++){';
	echo 'if(headings[i].textContent.indexOf("Billing")!==-1){';
	echo 'headings[i].parentNode.insertBefore(card,headings[i]);';
	echo 'return;';
	echo '}}';
	echo '},500);';
	echo '</script>';
}
