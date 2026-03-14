# SUS Divi REST

Lets external tools (e.g. scripts using your WordPress Application Password) **read and update Divi Theme Builder** footer, header, and body content via the REST API.

## Install

1. Upload the folder `sus-divi-rest` to your WordPress site’s `wp-content/plugins/` directory (e.g. via FTP, cPanel File Manager, or zip and **Plugins → Add New → Upload**).
2. In **Plugins**, activate **SUS Divi REST**.

## Security

- Endpoints require **WordPress Application Password** (or another logged-in user with `edit_theme_options`).
- Only users who can **edit theme options** can use these routes.

## Endpoints

Base URL: `https://yoursite.com/wp-json/sus-divi/v1`

Each area has **GET** (read) and **PATCH** (find/replace update):

| Area    | GET | PATCH |
|---------|-----|--------|
| Footer  | `/footer`  | `/footer`  |
| Header  | `/header`  | `/header`  |
| Body    | `/body`    | `/body`   |

### GET /footer, /header, /body

Returns the raw content of your Divi layout(s) for that area.

**Example:**
```bash
curl -s -u "your_username:your_application_password" \
  "https://yoursite.com/wp-json/sus-divi/v1/footer"
```

### PATCH /footer, /header, /body

Updates that area’s content by replacing one string with another (find/replace).

**Body (JSON):** `find` (string), `replace` (string)

**Example:**
```bash
curl -X PATCH -u "your_username:your_application_password" \
  -H "Content-Type: application/json" \
  -d '{"find":"Old text","replace":"New text"}' \
  "https://yoursite.com/wp-json/sus-divi/v1/header"
```

After you install and activate the plugin, the ops-app scripts can use your existing `WORDPRESS_URL` and Application Password to update footer, header, or body.
