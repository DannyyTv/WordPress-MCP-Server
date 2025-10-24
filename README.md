# WordPress MCP Server

A robust, secure Model Context Protocol (MCP) server for WordPress integration. This server allows Claude Desktop and Claude Code to interact with WordPress sites through the REST API with comprehensive error handling, security best practices, and type safety.

## Features

- ✅ **Complete WordPress Integration**: Create, update, delete, and list posts
- 🔒 **Security First**: Application Password authentication, standard TLS verification, input validation
- 🛡️ **Robust Error Handling**: Comprehensive error catching and user-friendly messages
- 📝 **Type Safety**: Full TypeScript implementation with Zod validation
- 🚀 **Performance**: Configurable timeouts, connection testing, optimized requests
- 📊 **Monitoring**: Structured logging with configurable levels
- 🔄 **MCP Compatibility**: Works with Claude Desktop and Claude Code (Stdio-based)
- 🔌 **Stdio Transport**: Uses Standard Input/Output for JSON-RPC 2.0 communication

## Quick Start

### System Requirements

**REQUIRED:**
- **Node.js 18.0.0 or higher** ⚠️ **MANDATORY** - Claude Desktop uses Node.js to execute this MCP server
  - Download: https://nodejs.org/
  - Verify: Run `node --version` in your terminal
- **npm** (Node Package Manager) - Usually installed with Node.js
  - Verify: Run `npm --version` in your terminal
- **A WordPress site** with REST API enabled
- **Your WordPress Application Password** (created in setup instructions below)

Without Node.js installed, Claude Desktop cannot run this server.

### Method 1: Claude Desktop (Recommended)

This is the easiest way to use the WordPress MCP Server with Claude Desktop.

#### Step 1: Build and Setup the Server

⚠️ **This step is required.** Claude Desktop needs the compiled `dist/` folder and dependencies to run.

```bash
git clone https://github.com/DannyyTv/WordPress-MCP-Server.git
cd WordPress-MCP-Server
npm install
npm run build
```

What this does:
- `npm install` - Downloads all required Node.js dependencies (required by the server)
- `npm run build` - Compiles TypeScript to JavaScript in the `dist/` folder
- Both steps are **mandatory** for Claude Desktop to execute the server

#### Step 2: Create WordPress Application Password

1. Go to your WordPress admin: `Users > Profile`
2. Scroll to "Application Passwords"
3. Enter a name like "Claude Desktop MCP"
4. Click "Add New Application Password"
5. Copy the generated password (you'll need it in the next step)

#### Step 3: Get Your WordPress REST API URL

Your WordPress REST API URL is typically:
```
https://your-site.com
```

(The `/wp-json/wp/v2/` part is added automatically by the server)

#### Step 4: Add to Claude Desktop Config

Open your Claude Desktop configuration file:
- **Mac/Linux**: `~/.config/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add this configuration under `mcpServers`:

```json
{
  "mcpServers": {
    "wordpress": {
      "command": "node",
      "args": ["/Users/YOUR-USERNAME/WordPress-MCP-Server/dist/index.js"],
      "env": {
        "WORDPRESS_URL": "https://your-wordpress-site.com",
        "WORDPRESS_USERNAME": "your-email@example.com",
        "WORDPRESS_APP_PASSWORD": "your-application-password"
      }
    }
  }
}
```

**Important:** Replace the values with your actual WordPress credentials:
- `WORDPRESS_URL`: Your WordPress site URL (e.g., `https://mindsnapz.de`)
- `WORDPRESS_USERNAME`: Your WordPress username or email
- `WORDPRESS_APP_PASSWORD`: The application password you created in Step 2

#### Step 5: Restart Claude Desktop

After updating the config, **completely close and restart Claude Desktop** for changes to take effect.

The WordPress tools will then be available in Claude. If you get a "connection failed" error:
1. Verify Node.js is installed: `node --version` should show 18.0.0 or higher
2. Verify the path to `dist/index.js` is correct in your config
3. Verify you completed Step 1 (npm install & npm run build)

---

### Method 2: Command Line / Testing

For testing the server locally or in automation scripts:

#### Using Environment Variables

```bash
export WORDPRESS_URL=https://your-wordpress-site.com
export WORDPRESS_USERNAME=your-email@example.com
export WORDPRESS_APP_PASSWORD=your-application-password

npm run build
npm start
```

#### Using .env File

```bash
cp .env.example .env
```

Edit `.env` with your WordPress credentials:

```bash
WORDPRESS_URL=https://your-wordpress-site.com
WORDPRESS_USERNAME=your-email@example.com
WORDPRESS_APP_PASSWORD=your-application-password
```

Then run:

```bash
npm run build
npm start
```

Note: `.env` wird vom Prozess aus dem aktuellen Arbeitsverzeichnis geladen. Wenn ein GUI‑Prozess (z. B. Claude Desktop) das Working Directory anders setzt, kann `.env` unentdeckt bleiben. In diesem Fall die Variablen als OS‑Umgebungsvariablen setzen oder den Prozess aus dem Repo‑Verzeichnis starten.

**For Claude Desktop specifically:**
- **Option 1 (Recommended):** Set credentials in the `env` field of `claude_desktop_config.json` (see Method 1, Step 4 above)
- **Option 2:** Set system-wide environment variables:
  - **macOS**: Add to `~/.zprofile` or `~/.bash_profile`:
    ```bash
    export WORDPRESS_URL="https://your-site.com"
    export WORDPRESS_USERNAME="your-email@example.com"
    export WORDPRESS_APP_PASSWORD="your-app-password"
    ```
    Restart Claude Desktop for changes to take effect.
  - **Windows**: Settings > System > Environment Variables > New User Variable:
    - `WORDPRESS_URL` = `https://your-site.com`
    - `WORDPRESS_USERNAME` = `your-email@example.com`
    - `WORDPRESS_APP_PASSWORD` = `your-app-password`

    Restart Claude Desktop for changes to take effect.
  - **Linux**: Add to `~/.bashrc` or `~/.zshrc`:
    ```bash
    export WORDPRESS_URL="https://your-site.com"
    export WORDPRESS_USERNAME="your-email@example.com"
    export WORDPRESS_APP_PASSWORD="your-app-password"
    ```
    Restart Claude Desktop (or run `source ~/.bashrc`).

#### Testing with Manual Requests

```bash
# Initialize the server:
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}' | npm start

# List available tools:
echo '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | npm start

# Test WordPress connection:
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"test_wordpress_connection","arguments":{}}}' | npm start
```

---

### Method 3: Development Mode

For development with hot reload:

```bash
npm run dev
```

Then in another terminal, test with MCP requests as shown in Method 2.

## Transport & Compatibility

### Stdio-Based Communication

This MCP server uses **Stdio (Standard Input/Output)** for JSON-RPC 2.0 communication. The server reads JSON-RPC requests from standard input and writes responses to standard output. This design enables direct process integration with Claude tools.

### Compatible Clients

- ✅ **Claude Desktop**: Full support via process spawning
- ✅ **Claude Code**: Full support via stdio piping
- ❌ **HTTP/REST Tools**: Not compatible (no HTTP endpoint)
- ❌ **Browser-Based Tools**: Not compatible (requires native process execution)
- ❌ **Web Services**: Not compatible (no HTTP server)

### Why Stdio-Only?

Stdio transport provides:
- **Direct process communication** without network overhead
- **Secure credentials** - environment variables stay local, never transmitted over network
- **Tight integration** with Claude Desktop/Code's subprocess execution model
- **Simplicity** - no need for HTTP server, port binding, or network configuration

### Future Transport Options

For other transport methods (HTTP/SSE), a separate implementation would be needed. Currently, this server focuses on optimal integration with Claude's native tools.

## Available Tools

### `create_wordpress_post`
Create a new WordPress post.

**Parameters:**
- `title` (required): Post title (max 255 characters)
- `content` (required): Post content (HTML or plain text)
- `status`: Post status (`publish`, `draft`, `private`) - default: `draft`
- `excerpt`: Post excerpt (optional)
- `categories`: Array of category IDs (optional)
- `tags`: Array of tag IDs (optional)

**Example:**
```
Create a new blog post with the title "Hello World" and content "This is my first post using the MCP server!"
```

### `update_wordpress_post`
Update an existing WordPress post.

**Parameters:**
- `id` (required): Post ID to update
- `title`: New title (optional)
- `content`: New content (optional)
- `status`: New status (optional)
- `excerpt`: New excerpt (optional)
- `categories`: New category IDs (optional)
- `tags`: New tag IDs (optional)

**Example:**
```
Update post ID 123 to change the status to "publish" and update the title to "Updated Title"
```

### `delete_wordpress_post`
Delete a WordPress post.

**Parameters:**
- `id` (required): Post ID to delete
- `force`: Permanently delete (`true`) or move to trash (`false`) - default: `false`

**Example:**
```
Delete post ID 456, moving it to trash
```

### `list_wordpress_posts`
List WordPress posts with filtering options.

**Parameters:**
- `per_page`: Posts per page (1-100) - default: `10`
- `page`: Page number - default: `1`
- `status`: Filter by status (`publish`, `draft`, `private`, `pending`, `future`, `any`) - default: `any`
- `search`: Search term for title and content
- `author`: Filter by author ID
- `categories`: Filter by category IDs
- `tags`: Filter by tag IDs
- `order`: Sort order (`asc`, `desc`) - default: `desc`
- `orderby`: Sort by field (`date`, `id`, `title`, `slug`, `modified`) - default: `date`
- `include_content`: Include post content preview in results - default: `false`

**Example:**
```
List the 5 most recent published posts with content
```

### `get_wordpress_post`
Get a single WordPress post by ID with full content.

**Parameters:**
- `id` (required): Post ID to retrieve
- `context`: Context for the request (`view`, `embed`, `edit`) - default: `edit`

**Example:**
```
Get post ID 123 with full details
```

### `get_wordpress_categories`
Get WordPress categories for content organization with optional pagination.

**Parameters:**
- `per_page`: Results per page (1-100) - default: `100`
- `page`: Page number - default: `1`

**Returns:** List of categories with name, slug, description, and post count.

**Note:** Large `per_page` values may result in large response sizes. For optimal performance, use per_page: 10-20 for categories/tags.

**Example:**
```
Get WordPress categories (first page with 100 results)
Get WordPress categories page 2
Get WordPress categories page 1 with 50 results per page
```

### `get_wordpress_tags`
Get WordPress tags for content tagging with optional pagination.

**Parameters:**
- `per_page`: Results per page (1-100) - default: `100`
- `page`: Page number - default: `1`

**Returns:** List of tags with name, slug, description, and post count.

**Note:** Large `per_page` values may result in large response sizes. For optimal performance, use per_page: 10-20 for categories/tags.

**Example:**
```
Get WordPress tags (first page with 100 results)
Get WordPress tags page 2
Get WordPress tags page 1 with 50 results per page
```

### `test_wordpress_connection`
Test WordPress API connection and authentication.

**Example:**
```
Test the WordPress connection
```

## Security Features

- **Application Password Authentication**: Secure, revocable authentication
- **TLS Certificate Verification**: Uses Node/Axios standard TLS verification; no insecure overrides
- **Input Validation**: Comprehensive validation using Zod schemas
- **Rate Limiting Awareness**: Proper handling of WordPress rate limits
- **Error Sanitization**: Prevents sensitive information leakage
- **Timeout Protection**: Configurable request timeouts

## Configuration Options

Environment variables in `.env`:

```bash
# Required
WORDPRESS_URL=https://your-site.com
WORDPRESS_USERNAME=your-username
WORDPRESS_APP_PASSWORD=your-app-password

# Optional
MCP_SERVER_NAME=wordpress-mcp
MCP_SERVER_VERSION=1.0.0
LOG_LEVEL=info                 # error, warn, info, debug
REQUEST_TIMEOUT=30000          # milliseconds
```

## Development

```bash
# Install dependencies
npm install

# Development with hot reload
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Type checking
npm run type-check
```

## Troubleshooting

### Common Issues

1. **Authentication Failed (401)**
   - Verify username and application password
   - Check if Application Passwords are enabled in WordPress

2. **Permission Denied (403)**
   - Ensure user has `publish_posts` capability
   - Try with Administrator role

3. **REST API Not Found (404)**
   - Verify WordPress REST API is enabled
   - Check if security plugins are blocking API access

4. **Connection Timeout**
   - Increase `REQUEST_TIMEOUT` value
   - Check WordPress site accessibility

5. **Rate Limit Exceeded (429)**
   - Wait before making more requests
   - Consider implementing request queuing

### Debug Mode

Enable debug logging with detailed output:

```bash
# Development mode with hot reload and debug logging
LOG_LEVEL=debug npm run dev

# Or production mode with debug logging
LOG_LEVEL=debug npm start
```

### Testing Connection

Use the built-in connection test:

```bash
# Calls the built-in MCP tool over stdin to verify credentials/connectivity
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"test_wordpress_connection","arguments":{}}}' | npm start
```

## Architecture

- **`src/index.ts`**: Main MCP server implementation with 8 available tools
- **`src/wordpress-api.ts`**: WordPress REST API client with security features and type safety
- **`src/types.ts`**: TypeScript interfaces and Zod validation schemas (WordPressPost, WordPressCategory, WordPressTag, etc.)
- **`src/logger.ts`**: Structured logging implementation with configurable log levels

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Run `npm run lint` and `npm run type-check`
5. Submit a pull request

## Support

For issues and questions:
1. Check the troubleshooting section
2. Verify your WordPress configuration
3. Test with debug logging enabled
4. Review the server logs for detailed error information
