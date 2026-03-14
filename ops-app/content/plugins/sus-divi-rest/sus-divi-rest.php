<?php
/**
 * Plugin Name: SUS Divi REST
 * Description: Exposes Divi Theme Builder footer, header, and body via REST API so external tools can read and update layout content using Application Password auth.
 * Version: 1.1.0
 * Author: School Uniform Solutions
 *
 * Install: Upload the folder sus-divi-rest to wp-content/plugins/ and activate.
 * REST: GET/PATCH /wp-json/sus-divi/v1/footer | /header | /body (uses WordPress Application Password).
 */

defined('ABSPATH') || exit;

$sus_divi_layout_config = [
    'footer' => ['post_type' => 'et_footer_layout', 'meta_key' => '_et_footer_layout_id'],
    'header' => ['post_type' => 'et_header_layout', 'meta_key' => '_et_header_layout_id'],
    'body'   => ['post_type' => 'et_body_layout', 'meta_key' => '_et_body_layout_id'],
];

add_action('rest_api_init', function () use ($sus_divi_layout_config) {
    $permission = function () {
        return current_user_can('edit_theme_options');
    };
    $patch_args = [
        'find'    => ['type' => 'string', 'required' => false],
        'replace' => ['type' => 'string', 'required' => false],
    ];
    foreach (array_keys($sus_divi_layout_config) as $area) {
        register_rest_route('sus-divi/v1', '/' . $area, [
            'methods'             => 'GET',
            'callback'            => function ($request) use ($area) {
                return sus_divi_rest_get_layout($request, $area);
            },
            'permission_callback' => $permission,
        ]);
        register_rest_route('sus-divi/v1', '/' . $area, [
            'methods'             => 'PATCH',
            'callback'            => function ($request) use ($area) {
                return sus_divi_rest_patch_layout($request, $area);
            },
            'permission_callback' => $permission,
            'args'                => $patch_args,
        ]);
    }
});

/**
 * Find Divi layout post(s) for an area (footer, header, body).
 * Tries direct post_type query first, then theme builder / et_template meta.
 */
function sus_divi_get_layout_ids($area) {
    global $sus_divi_layout_config;
    if (!isset($sus_divi_layout_config[ $area ])) {
        return [];
    }
    $post_type = $sus_divi_layout_config[ $area ]['post_type'];
    $meta_key  = $sus_divi_layout_config[ $area ]['meta_key'];
    $ids       = [];
    // Direct: published layouts of this type
    $posts = get_posts([
        'post_type'      => $post_type,
        'post_status'    => 'publish',
        'posts_per_page' => 50,
        'fields'         => 'ids',
    ]);
    if (!empty($posts)) {
        return $posts;
    }
    // Fallback: from theme builder template meta
    foreach (['et_theme_builder', 'et_template'] as $tb_type) {
        $templates = get_posts([
            'post_type'      => $tb_type,
            'post_status'    => 'publish',
            'posts_per_page' => 20,
        ]);
        foreach ($templates as $t) {
            $layout_id = (int) get_post_meta($t->ID, $meta_key, true);
            if ($layout_id > 0) {
                $ids[] = $layout_id;
            }
        }
    }
    return array_unique(array_filter($ids));
}

function sus_divi_rest_get_layout(\WP_REST_Request $request, $area) {
    global $sus_divi_layout_config;
    $ids = sus_divi_get_layout_ids($area);
    if (empty($ids)) {
        return new \WP_REST_Response([
            'error' => sprintf('No Divi %s layout found.', $area),
            'hint'  => 'Create one in Divi > Theme Builder.',
        ], 404);
    }
    $post_type = $sus_divi_layout_config[ $area ]['post_type'];
    $items     = [];
    foreach ($ids as $id) {
        $post = get_post($id);
        if (!$post || $post->post_type !== $post_type) {
            continue;
        }
        $items[] = [
            'id'      => (int) $post->ID,
            'content' => $post->post_content,
        ];
    }
    return new \WP_REST_Response([ $area . 's' => $items ], 200);
}

function sus_divi_rest_patch_layout(\WP_REST_Request $request, $area) {
    global $sus_divi_layout_config;
    $find    = $request->get_param('find');
    $replace = $request->get_param('replace');
    if ($find === null || $replace === null) {
        return new \WP_REST_Response(['error' => 'Missing "find" or "replace" in JSON body.'], 400);
    }
    $ids = sus_divi_get_layout_ids($area);
    if (empty($ids)) {
        return new \WP_REST_Response([
            'error' => sprintf('No Divi %s layout found.', $area),
        ], 404);
    }
    $post_type = $sus_divi_layout_config[ $area ]['post_type'];
    $updated   = [];
    foreach ($ids as $id) {
        $post = get_post($id);
        if (!$post || $post->post_type !== $post_type) {
            continue;
        }
        $content     = $post->post_content;
        $new_content = str_ireplace($find, $replace, $content);
        if ($new_content === $content) {
            continue;
        }
        $r = wp_update_post([
            'ID'           => $post->ID,
            'post_content' => $new_content,
        ], true);
        if (is_wp_error($r)) {
            return new \WP_REST_Response(['error' => $r->get_error_message()], 500);
        }
        $updated[] = (int) $post->ID;
    }
    if (empty($updated)) {
        return new \WP_REST_Response([
            'message'      => sprintf('No %s contained the "find" text; nothing updated.', $area),
            'ids_checked'  => $ids,
        ], 200);
    }
    return new \WP_REST_Response([
        'updated' => $updated,
        'message' => ucfirst($area) . '(s) updated.',
    ], 200);
}
