# WordPress MCP Server

A robust, secure Model Context Protocol (MCP) server for WordPress integration. This server allows Claude Desktop and Claude Code to interact with WordPress sites through the REST API with comprehensive error handling, security best practices, and type safety.

## Features

- ✅ **Complete WordPress Integration**: Create, update, delete, and list posts
- 🔒 **Security First**: Application Password authentication, SSL verification, input validation
- 🛡️ **Robust Error Handling**: Comprehensive error catching and user-friendly messages
- 📝 **Type Safety**: Full TypeScript implementation with Zod validation
- 🚀 **Performance**: Configurable timeouts, connection testing, optimized requests
- 📊 **Monitoring**: Structured logging with configurable levels
- 🔄 **MCP Compatibility**: Works with both Claude Desktop and Claude Code

## Quick Start

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/yourusername/wordpress-mcp-server.git
cd wordpress-mcp-server
npm install
```

### 2. Configuration

Copy the environment template:

```bash
cp .env.example .env
```

Edit `.env` with your WordPress credentials:

```bash
WORDPRESS_URL=https://your-wordpress-site.com
WORDPRESS_USERNAME=your-username
WORDPRESS_APP_PASSWORD=your-application-password
```

### 3. WordPress Setup

#### Create Application Password

1. Go to your WordPress admin: `Users > Profile`
2. Scroll to "Application Passwords"
3. Enter a name like "MCP Server"
4. Click "Add New Application Password"
5. Copy the generated password (save it securely!)

#### Verify REST API

Test your REST API is accessible:
```bash
curl -u "username:app-password" https://your-site.com/wp-json/wp/v2/posts?per_page=1
```

### 4. Build and Test

```bash
# Build the server
npm run build

# Test the server (development mode with hot reload)
npm run dev

# In another terminal, you can test with a valid MCP request
# Initialize the server:
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}' | npm start

# List available tools:
echo '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | npm start

# Test WordPress connection:
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"test_wordpress_connection","arguments":{}}}' | npm start
```

## Claude Desktop Configuration

### Security Warning ⚠️
**Never store credentials directly in `claude_desktop_config.json`!** Use environment variables instead.

Add to your Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "wordpress": {
      "command": "node",
      "args": ["/Users/YOUR-USERNAME/wordpress-mcp-server/dist/index.js"]
    }
  }
}
```

Then set environment variables in your shell:

```bash
export WORDPRESS_URL=https://your-wordpress-site.com
export WORDPRESS_USERNAME=your-username
export WORDPRESS_APP_PASSWORD=your-application-password
```

Or add to your shell profile (`.zshrc`, `.bash_profile`, etc.):

```bash
# ~/.zshrc or ~/.bash_profile
export WORDPRESS_URL="https://your-wordpress-site.com"
export WORDPRESS_USERNAME="your-username"
export WORDPRESS_APP_PASSWORD="your-application-password"
```

Then restart Claude Desktop for the changes to take effect.

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

- **Application Password Authentication**: Secure, token-based authentication
- **SSL Certificate Verification**: Rejects unauthorized certificates in production
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

```
Test the WordPress connection
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