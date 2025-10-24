import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import dotenv from 'dotenv';

import {
  Config,
  ConfigSchema,
  WordPressError,
  ValidationError,
  CreatePostArgsSchema,
  UpdatePostArgsSchema,
  DeletePostArgsSchema,
  ListPostsArgsSchema,
  GetPostArgsSchema,
  GetCategoriesArgsSchema,
  GetTagsArgsSchema
} from './types.js';
import { WordPressApiClient } from './wordpress-api.js';
import { ConsoleLogger } from './logger.js';

// Load environment variables
dotenv.config();

class WordPressMcpServer {
  private server: Server;
  private wordpressClient: WordPressApiClient;
  private logger: ConsoleLogger;
  private config: Config;

  constructor() {
    // Validate and load configuration
    this.config = this.loadConfig();
    this.logger = new ConsoleLogger(this.config.LOG_LEVEL);

    // Initialize WordPress API client
    this.wordpressClient = new WordPressApiClient(this.config, this.logger);

    // Initialize MCP server
    this.server = new Server({
      name: this.config.MCP_SERVER_NAME,
      version: this.config.MCP_SERVER_VERSION,
    }, {
      capabilities: {
        tools: {},
      }
    });

    this.setupMcpHandlers();
  }

  private loadConfig(): Config {
    try {
      const rawConfig = {
        WORDPRESS_URL: process.env.WORDPRESS_URL,
        WORDPRESS_USERNAME: process.env.WORDPRESS_USERNAME,
        WORDPRESS_APP_PASSWORD: process.env.WORDPRESS_APP_PASSWORD,
        MCP_SERVER_NAME: process.env.MCP_SERVER_NAME || 'wordpress-mcp',
        MCP_SERVER_VERSION: process.env.MCP_SERVER_VERSION || '1.0.0',
        LOG_LEVEL: process.env.LOG_LEVEL || 'info',
        REQUEST_TIMEOUT: process.env.REQUEST_TIMEOUT ? 
          parseInt(process.env.REQUEST_TIMEOUT) : 30000,
      };

      return ConfigSchema.parse(rawConfig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map(issue => 
          `${issue.path.join('.')}: ${issue.message}`
        ).join(', ');
        throw new Error(`Configuration validation failed: ${issues}`);
      }
      throw new Error(`Failed to load configuration: ${error}`);
    }
  }

  private setupMcpHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      this.logger.debug('Listing available WordPress tools');
      
      return {
        tools: [
          {
            name: 'create_wordpress_post',
            description: 'Create a new WordPress post with title, content, and optional metadata',
            inputSchema: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'Post title (required, max 255 chars)',
                  minLength: 1,
                  maxLength: 255
                },
                content: {
                  type: 'string',
                  description: 'Post content in HTML or plain text (required)',
                  minLength: 1
                },
                status: {
                  type: 'string',
                  description: 'Post status',
                  enum: ['publish', 'draft', 'private'],
                  default: 'draft'
                },
                excerpt: {
                  type: 'string',
                  description: 'Post excerpt/summary (optional)'
                },
                categories: {
                  type: 'array',
                  items: { type: 'number' },
                  description: 'Category IDs (optional)'
                },
                tags: {
                  type: 'array',
                  items: { type: 'number' },
                  description: 'Tag IDs (optional)'
                }
              },
              required: ['title', 'content'],
              additionalProperties: false
            }
          },
          {
            name: 'update_wordpress_post',
            description: 'Update an existing WordPress post',
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'number',
                  description: 'Post ID to update (required)',
                  minimum: 1
                },
                title: {
                  type: 'string',
                  description: 'New post title (optional)',
                  minLength: 1,
                  maxLength: 255
                },
                content: {
                  type: 'string',
                  description: 'New post content (optional)',
                  minLength: 1
                },
                status: {
                  type: 'string',
                  description: 'New post status (optional)',
                  enum: ['publish', 'draft', 'private']
                },
                excerpt: {
                  type: 'string',
                  description: 'New post excerpt (optional)'
                },
                categories: {
                  type: 'array',
                  items: { type: 'number' },
                  description: 'New category IDs (optional)'
                },
                tags: {
                  type: 'array',
                  items: { type: 'number' },
                  description: 'New tag IDs (optional)'
                }
              },
              required: ['id'],
              additionalProperties: false
            }
          },
          {
            name: 'delete_wordpress_post',
            description: 'Delete a WordPress post (move to trash or permanently delete)',
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'number',
                  description: 'Post ID to delete (required)',
                  minimum: 1
                },
                force: {
                  type: 'boolean',
                  description: 'Permanently delete (true) or move to trash (false)',
                  default: false
                }
              },
              required: ['id'],
              additionalProperties: false
            }
          },
          {
            name: 'list_wordpress_posts',
            description: 'List WordPress posts with filtering and pagination options',
            inputSchema: {
              type: 'object',
              properties: {
                per_page: {
                  type: 'number',
                  description: 'Posts per page (1-100)',
                  minimum: 1,
                  maximum: 100,
                  default: 10
                },
                page: {
                  type: 'number',
                  description: 'Page number',
                  minimum: 1,
                  default: 1
                },
                status: {
                  type: 'string',
                  description: 'Filter by post status',
                  enum: ['publish', 'draft', 'private', 'pending', 'future', 'any'],
                  default: 'any'
                },
                search: {
                  type: 'string',
                  description: 'Search term for title and content'
                },
                author: {
                  type: 'number',
                  description: 'Filter by author ID'
                },
                categories: {
                  type: 'array',
                  items: { type: 'number' },
                  description: 'Filter by category IDs'
                },
                tags: {
                  type: 'array',
                  items: { type: 'number' },
                  description: 'Filter by tag IDs'
                },
                order: {
                  type: 'string',
                  description: 'Sort order',
                  enum: ['asc', 'desc'],
                  default: 'desc'
                },
                orderby: {
                  type: 'string',
                  description: 'Sort by field',
                  enum: ['date', 'id', 'title', 'slug', 'modified'],
                  default: 'date'
                },
                include_content: {
                  type: 'boolean',
                  description: 'Include post content preview in results',
                  default: false
                }
              },
              additionalProperties: false
            }
          },
          {
            name: 'test_wordpress_connection',
            description: 'Test WordPress API connection and authentication',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false
            }
          },
          {
            name: 'get_wordpress_post',
            description: 'Get a single WordPress post by ID with full content',
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'number',
                  description: 'Post ID to retrieve (required)',
                  minimum: 1
                },
                context: {
                  type: 'string',
                  description: 'Context for the request (view, embed, edit)',
                  enum: ['view', 'embed', 'edit'],
                  default: 'edit'
                }
              },
              required: ['id'],
              additionalProperties: false
            }
          },
          {
            name: 'get_wordpress_categories',
            description: 'Get WordPress categories for content organization with pagination',
            inputSchema: {
              type: 'object',
              properties: {
                per_page: {
                  type: 'number',
                  description: 'Results per page (1-100)',
                  minimum: 1,
                  maximum: 100,
                  default: 100
                },
                page: {
                  type: 'number',
                  description: 'Page number',
                  minimum: 1,
                  default: 1
                }
              },
              additionalProperties: false
            }
          },
          {
            name: 'get_wordpress_tags',
            description: 'Get WordPress tags for content tagging with pagination',
            inputSchema: {
              type: 'object',
              properties: {
                per_page: {
                  type: 'number',
                  description: 'Results per page (1-100)',
                  minimum: 1,
                  maximum: 100,
                  default: 100
                },
                page: {
                  type: 'number',
                  description: 'Page number',
                  minimum: 1,
                  default: 1
                }
              },
              additionalProperties: false
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      this.logger.info(`Executing WordPress tool: ${name}`, { args });

      try {
        switch (name) {
          case 'create_wordpress_post':
            return await this.handleCreatePost(args);
          
          case 'update_wordpress_post':
            return await this.handleUpdatePost(args);
          
          case 'delete_wordpress_post':
            return await this.handleDeletePost(args);
          
          case 'list_wordpress_posts':
            return await this.handleListPosts(args);
          
          case 'test_wordpress_connection':
            return await this.handleTestConnection();
          
          case 'get_wordpress_post':
            return await this.handleGetPost(args);
          
          case 'get_wordpress_categories':
            return await this.handleGetCategories(args);

          case 'get_wordpress_tags':
            return await this.handleGetTags(args);
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        return this.handleToolError(error, name, args);
      }
    });
  }

  private async handleCreatePost(args: unknown) {
    const validatedArgs = CreatePostArgsSchema.parse(args);
    const post = await this.wordpressClient.createPost(validatedArgs);
    
    return {
      content: [
        {
          type: 'text',
          text: `WordPress post created successfully!\n\nID: ${post.id}\nTitle: ${post.title?.rendered || 'Untitled'}\nStatus: ${post.status}\nURL: ${post.link || 'N/A'}\n\nContent preview: ${post.content?.rendered?.substring(0, 200) || 'No content'}...`
        }
      ]
    };
  }

  private async handleUpdatePost(args: unknown) {
    const validatedArgs = UpdatePostArgsSchema.parse(args);
    const post = await this.wordpressClient.updatePost(validatedArgs);
    
    return {
      content: [
        {
          type: 'text',
          text: `WordPress post updated successfully!\n\nID: ${post.id}\nTitle: ${post.title?.rendered || 'Untitled'}\nStatus: ${post.status}\nURL: ${post.link || 'N/A'}\nLast modified: ${post.modified || 'N/A'}`
        }
      ]
    };
  }

  private async handleDeletePost(args: unknown) {
    const validatedArgs = DeletePostArgsSchema.parse(args);
    const result = await this.wordpressClient.deletePost(validatedArgs);
    
    const action = validatedArgs.force ? 'permanently deleted' : 'moved to trash';
    return {
      content: [
        {
          type: 'text',
          text: `WordPress post ${action} successfully!\n\nID: ${result.previous.id}\nTitle: ${result.previous.title?.rendered || 'Untitled'}\nDeleted: ${result.deleted}`
        }
      ]
    };
  }

  private async handleListPosts(args: unknown) {
    const validatedArgs = ListPostsArgsSchema.parse(args);
    const posts = await this.wordpressClient.listPosts(validatedArgs);

    if (posts.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No WordPress posts found matching the criteria.'
          }
        ]
      };
    }

    const postList = posts.map(post => {
      const title = (post.title?.rendered || post.title?.raw || 'Untitled').trim();
      const modifiedDate = post.modified ? post.modified.split('T')[0] : 'N/A';
      let postInfo = `• ID: ${post.id} | ${title} | Status: ${post.status} | Modified: ${modifiedDate}`;

      if (validatedArgs.include_content && post.content?.rendered) {
        const content = post.content.rendered.substring(0, 150);
        postInfo += `\n  Content: ${content}${content.length >= 150 ? '...' : ''}`;
      }

      return postInfo;
    }).join('\n\n');

    const paginationInfo = validatedArgs.page || validatedArgs.per_page
      ? ` (Page ${validatedArgs.page || 1}, ${validatedArgs.per_page || 10} per page)`
      : '';

    const responseText = `Found ${posts.length} WordPress posts${paginationInfo}:\n\n${postList}`;

    return {
      content: [
        {
          type: 'text',
          text: responseText
        }
      ]
    };
  }

  private async handleTestConnection() {
    const result = await this.wordpressClient.testConnection();
    
    return {
      content: [
        {
          type: 'text',
          text: `WordPress connection test ${result.success ? 'PASSED' : 'FAILED'}\n\nMessage: ${result.message}\n\nURL: ${this.config.WORDPRESS_URL}\nUsername: ${this.config.WORDPRESS_USERNAME}`
        }
      ]
    };
  }

  private async handleGetPost(args: unknown) {
    const validatedArgs = GetPostArgsSchema.parse(args);
    const post = await this.wordpressClient.getPost(validatedArgs);

    const title = (post.title?.rendered || post.title?.raw || 'Untitled').trim();
    const excerpt = (post.excerpt?.rendered || post.excerpt?.raw || '').trim();
    const content = post.content?.raw || post.content?.rendered || 'No content available';

    const responseText = `WordPress Post Details:\n\nID: ${post.id}\nTitle: ${title}\nStatus: ${post.status}\nURL: ${post.link || 'N/A'}\nPublished: ${post.date ? post.date.split('T')[0] : 'N/A'}\nModified: ${post.modified ? post.modified.split('T')[0] : 'N/A'}\n\nExcerpt:\n${excerpt}\n\nContent:\n${content}`;

    return {
      content: [
        {
          type: 'text',
          text: responseText
        }
      ]
    };
  }

  private async handleGetCategories(args: unknown) {
    const validatedArgs = GetCategoriesArgsSchema.parse(args);
    const categories = await this.wordpressClient.getCategories(validatedArgs);

    if (categories.length === 0) {
      const pageNum = validatedArgs.page || 1;
      const message = pageNum > 1
        ? `No WordPress categories found on page ${pageNum}. Try a lower page number.`
        : 'No WordPress categories found.';

      return {
        content: [
          {
            type: 'text',
            text: message
          }
        ]
      };
    }

    const categoryList = categories.map(cat =>
      `• ID: ${cat.id} | ${cat.name} | Slug: ${cat.slug} | Posts: ${cat.count || 0}`
    ).join('\n');

    const paginationInfo = validatedArgs.page || validatedArgs.per_page
      ? ` (Page ${validatedArgs.page || 1}, ${validatedArgs.per_page || 100} per page)`
      : '';

    return {
      content: [
        {
          type: 'text',
          text: `WordPress Categories (${categories.length})${paginationInfo}:\n\n${categoryList}`
        }
      ]
    };
  }

  private async handleGetTags(args: unknown) {
    const validatedArgs = GetTagsArgsSchema.parse(args);
    const tags = await this.wordpressClient.getTags(validatedArgs);

    if (tags.length === 0) {
      const pageNum = validatedArgs.page || 1;
      const message = pageNum > 1
        ? `No WordPress tags found on page ${pageNum}. Try a lower page number.`
        : 'No WordPress tags found.';

      return {
        content: [
          {
            type: 'text',
            text: message
          }
        ]
      };
    }

    const tagList = tags.map(tag =>
      `• ID: ${tag.id} | ${tag.name} | Slug: ${tag.slug} | Posts: ${tag.count || 0}`
    ).join('\n');

    const paginationInfo = validatedArgs.page || validatedArgs.per_page
      ? ` (Page ${validatedArgs.page || 1}, ${validatedArgs.per_page || 100} per page)`
      : '';

    return {
      content: [
        {
          type: 'text',
          text: `WordPress Tags (${tags.length})${paginationInfo}:\n\n${tagList}`
        }
      ]
    };
  }

  private handleToolError(error: unknown, toolName: string, args: unknown) {
    this.logger.error(`Tool execution failed: ${toolName}`, { error, args });

    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => 
        `${issue.path.join('.')}: ${issue.message}`
      ).join(', ');
      
      return {
        content: [
          {
            type: 'text',
            text: `❌ Validation Error: ${issues}`
          }
        ],
        isError: true
      };
    }

    if (error instanceof WordPressError) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ WordPress Error (${error.code}): ${error.message}`
          }
        ],
        isError: true
      };
    }

    if (error instanceof ValidationError) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Validation Error: ${error.message}${error.field ? ` (Field: ${error.field})` : ''}`
          }
        ],
        isError: true
      };
    }

    // Generic error handling
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error executing ${toolName}: ${message}`
        }
      ],
      isError: true
    };
  }

  async start(): Promise<void> {
    // EINFACH: Nur MCP starten, keine Tests, keine Logs
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }

  async stop(): Promise<void> {
    await this.server.close();
  }
}

// Start the server
async function main(): Promise<void> {
  const server = new WordPressMcpServer();
  await server.start();
}

// Only run main if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}