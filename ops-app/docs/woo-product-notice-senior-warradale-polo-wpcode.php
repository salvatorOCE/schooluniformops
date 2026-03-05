<?php
/**
 * WPCode Snippet: Show "2026 Year 6 students only" in red bold on SENIOR WARRADALE POLO AND JUMPER product
 *
 * Use with WPCode (Code Snippets):
 * 1. Add new snippet → PHP Snippet
 * 2. Paste the code below (from add_action to the end of the function)
 * 3. Run everywhere (or "Run only on front-end")
 * 4. Activate
 *
 * Parents will see the notice only on this product so they know it's for seniors only.
 */

add_action('woocommerce_single_product_summary', function () {
	$product = wc_get_product(get_the_ID());
	if ( ! $product ) {
		return;
	}
	$name  = strtolower( $product->get_name() );
	$slug  = strtolower( $product->get_slug() );
	// Match "Warradale Senior Polo", "SENIOR WARRADALE POLO AND JUMPER", or any Warradale senior polo/jumper product
	$is_senior_warradale = (
		( strpos( $name, 'warradale' ) !== false && strpos( $name, 'senior' ) !== false && strpos( $name, 'polo' ) !== false ) ||
		( strpos( $name, 'warradale' ) !== false && strpos( $name, 'senior' ) !== false && strpos( $name, 'jumper' ) !== false ) ||
		( strpos( $slug, 'warradale' ) !== false && strpos( $slug, 'senior' ) !== false && ( strpos( $slug, 'polo' ) !== false || strpos( $slug, 'jumper' ) !== false ) )
	);
	if ( ! $is_senior_warradale ) {
		return;
	}
	echo '<p class="senior-only-notice" style="color:#b32d2e;font-weight:700;margin:0.5em 0 1em;">2026 Year 6 students only</p>';
}, 15);
