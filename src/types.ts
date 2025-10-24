import { z } from 'zod';

// Environment configuration schema with validation
export const ConfigSchema = z.object({
  WORDPRESS_URL: z.string().url('WordPress URL must be a valid URL'),
  WORDPRESS_USERNAME: z.string().min(1, 'WordPress username is required'),
  WORDPRESS_APP_PASSWORD: z.string().min(1, 'WordPress application password is required'),
  MCP_SERVER_NAME: z.string().default('wordpress-mcp'),
  MCP_SERVER_VERSION: z.string().default('1.0.0'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  REQUEST_TIMEOUT: z.coerce.number().min(1000).max(60000).default(30000),
});

export type Config = z.infer<typeof ConfigSchema>;

// WordPress API types
export interface WordPressPost {
  id?: number;
  title: {
    rendered?: string;
    raw?: string;
  };
  content: {
    rendered?: string;
    raw?: string;
  };
  excerpt?: {
    rendered?: string;
    raw?: string;
  } | undefined;
  status: 'publish' | 'draft' | 'private' | 'pending' | 'future';
  slug?: string;
  author?: number;
  featured_media?: number;
  comment_status?: 'open' | 'closed';
  ping_status?: 'open' | 'closed';
  categories?: number[] | undefined;
  tags?: number[] | undefined;
  date?: string;
  date_gmt?: string;
  modified?: string;
  modified_gmt?: string;
  link?: string;
  type?: string;
  meta?: Record<string, unknown>;
}

// WordPress Category interface
export interface WordPressCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
  taxonomy: string;
  parent?: number;
  _links?: Record<string, any>;
}

// WordPress Tag interface
export interface WordPressTag {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
  taxonomy: string;
  _links?: Record<string, any>;
}

export interface WordPressApiError {
  code: string;
  message: string;
  data?: {
    status: number;
    params?: Record<string, unknown>;
  };
}

// MCP Tool argument schemas with strict validation
export const CreatePostArgsSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  content: z.string().min(1, 'Content is required'),
  status: z.enum(['publish', 'draft', 'private']).default('draft'),
  excerpt: z.string().optional(),
  categories: z.array(z.number()).optional(),
  tags: z.array(z.number()).optional(),
});

export const UpdatePostArgsSchema = z.object({
  id: z.number().min(1, 'Post ID must be positive'),
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  status: z.enum(['publish', 'draft', 'private']).optional(),
  excerpt: z.string().optional(),
  categories: z.array(z.number()).optional(),
  tags: z.array(z.number()).optional(),
});

export const DeletePostArgsSchema = z.object({
  id: z.number().min(1, 'Post ID must be positive'),
  force: z.boolean().default(false),
});

export const ListPostsArgsSchema = z.object({
  per_page: z.number().min(1).max(100).default(10),
  page: z.number().min(1).default(1),
  status: z.enum(['publish', 'draft', 'private', 'pending', 'future', 'any']).default('any'),
  search: z.string().optional(),
  author: z.number().optional(),
  categories: z.array(z.number()).optional(),
  tags: z.array(z.number()).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  orderby: z.enum(['date', 'id', 'title', 'slug', 'modified']).default('date'),
  include_content: z.boolean().default(false),
});

export const GetPostArgsSchema = z.object({
  id: z.number().min(1, 'Post ID must be positive'),
  context: z.enum(['view', 'embed', 'edit']).default('edit'),
});

export const GetCategoriesArgsSchema = z.object({
  per_page: z.number().min(1).max(100).optional(),
  page: z.number().min(1).optional(),
}).strict();

export const GetTagsArgsSchema = z.object({
  per_page: z.number().min(1).max(100).optional(),
  page: z.number().min(1).optional(),
}).strict();

export type CreatePostArgs = z.infer<typeof CreatePostArgsSchema>;
export type UpdatePostArgs = z.infer<typeof UpdatePostArgsSchema>;
export type DeletePostArgs = z.infer<typeof DeletePostArgsSchema>;
export type ListPostsArgs = z.infer<typeof ListPostsArgsSchema>;
export type GetPostArgs = z.infer<typeof GetPostArgsSchema>;
export type GetCategoriesArgs = z.infer<typeof GetCategoriesArgsSchema>;
export type GetTagsArgs = z.infer<typeof GetTagsArgsSchema>;

// Error handling types
export class WordPressError extends Error {
  public readonly code: string;
  public readonly statusCode?: number | undefined;
  
  constructor(message: string, code: string = 'WORDPRESS_ERROR', statusCode?: number | undefined) {
    super(message);
    this.name = 'WordPressError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ValidationError extends Error {
  public readonly field?: string | undefined;
  
  constructor(message: string, field?: string | undefined) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

// Logging levels
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface Logger {
  error(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}