import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import {
  WordPressPost,
  WordPressError,
  CreatePostArgs,
  UpdatePostArgs,
  DeletePostArgs,
  ListPostsArgs,
  GetPostArgs,
  GetCategoriesArgs,
  GetTagsArgs,
  Config,
  Logger,
  WordPressCategory,
  WordPressTag
} from './types.js';

export class WordPressApiClient {
  private client: AxiosInstance;
  private logger: Logger;

  constructor(config: Config, logger: Logger) {
    this.logger = logger;
    
    // Create axios instance with security best practices
    this.client = axios.create({
      baseURL: this.normalizeUrl(config.WORDPRESS_URL),
      timeout: config.REQUEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `${config.MCP_SERVER_NAME}/${config.MCP_SERVER_VERSION}`,
        'Accept': 'application/json',
      },
      // Security: Use Application Password authentication
      auth: {
        username: config.WORDPRESS_USERNAME,
        password: config.WORDPRESS_APP_PASSWORD,
      },
      // Security: Default axios HTTPS handling is sufficient
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        this.logger.debug(`WordPress API response: ${response.status}`, {
          url: response.config.url,
          method: response.config.method,
        });
        return response;
      },
      (error: AxiosError) => {
        return this.handleApiError(error);
      }
    );

    // Add request interceptor for logging
    this.client.interceptors.request.use((config) => {
      this.logger.debug(`WordPress API request: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });
  }

  private normalizeUrl(url: string): string {
    // Ensure URL ends with /wp-json/wp/v2/
    const cleanUrl = url.replace(/\/$/, '');
    return `${cleanUrl}/wp-json/wp/v2`;
  }

  private handleApiError(error: AxiosError): Promise<never> {
    const response = error.response;
    
    if (!response) {
      // Network error or timeout
      this.logger.error('WordPress API network error', { 
        message: error.message,
        code: error.code 
      });
      throw new WordPressError(
        `Network error: ${error.message}`,
        'NETWORK_ERROR'
      );
    }

    const { status, data } = response;
    const wpError = data as any;

    this.logger.error('WordPress API error', {
      status,
      code: wpError?.code,
      message: wpError?.message,
      url: error.config?.url,
      method: error.config?.method,
    });

    // Handle specific WordPress error codes
    switch (status) {
      case 401:
        throw new WordPressError(
          'Invalid credentials. Check your username and application password.',
          'AUTHENTICATION_ERROR',
          401
        );
      case 403:
        throw new WordPressError(
          'Insufficient permissions. Check user role and capabilities.',
          'PERMISSION_ERROR',
          403
        );
      case 404:
        throw new WordPressError(
          'WordPress API endpoint not found. Check if REST API is enabled.',
          'NOT_FOUND_ERROR',
          404
        );
      case 429:
        throw new WordPressError(
          'Rate limit exceeded. Please wait before making more requests.',
          'RATE_LIMIT_ERROR',
          429
        );
      default:
        throw new WordPressError(
          wpError?.message || `WordPress API error (${status})`,
          wpError?.code || 'API_ERROR',
          status
        );
    }
  }

  // Test API connection and permissions
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.info('Testing WordPress API connection...');
      
      // Test basic API access
      await this.client.get('/posts', { params: { per_page: 1 } });
      
      this.logger.info('WordPress API connection successful');
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      const message = error instanceof WordPressError 
        ? error.message 
        : 'Unknown connection error';
      
      this.logger.error('WordPress API connection failed', { error: message });
      return { success: false, message };
    }
  }

  async createPost(args: CreatePostArgs): Promise<WordPressPost> {
    this.logger.info('Creating WordPress post', { title: args.title, status: args.status });
    
    try {
      const postData: Partial<WordPressPost> = {
        title: { raw: args.title },
        content: { raw: args.content },
        status: args.status,
        ...(args.excerpt && { excerpt: { raw: args.excerpt } }),
        ...(args.categories && { categories: args.categories }),
        ...(args.tags && { tags: args.tags }),
      };

      const response = await this.client.post<WordPressPost>('/posts', postData);
      
      this.logger.info('Post created successfully', { 
        id: response.data.id, 
        title: args.title 
      });
      
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create post', { title: args.title, error });
      throw error;
    }
  }

  async updatePost(args: UpdatePostArgs): Promise<WordPressPost> {
    this.logger.info('Updating WordPress post', { id: args.id });
    
    try {
      const updateData: Partial<WordPressPost> = {};
      
      if (args.title) updateData.title = { raw: args.title };
      if (args.content) updateData.content = { raw: args.content };
      if (args.status) updateData.status = args.status;
      if (args.excerpt) updateData.excerpt = { raw: args.excerpt };
      if (args.categories) updateData.categories = args.categories;
      if (args.tags) updateData.tags = args.tags;

      const response = await this.client.post<WordPressPost>(
        `/posts/${args.id}`, 
        updateData
      );
      
      this.logger.info('Post updated successfully', { id: args.id });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to update post', { id: args.id, error });
      throw error;
    }
  }

  async deletePost(args: DeletePostArgs): Promise<{ deleted: boolean; previous: WordPressPost }> {
    this.logger.info('Deleting WordPress post', { id: args.id, force: args.force });
    
    try {
      const response = await this.client.delete(`/posts/${args.id}`, {
        params: { force: args.force }
      });
      
      this.logger.info('Post deleted successfully', { id: args.id });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to delete post', { id: args.id, error });
      throw error;
    }
  }

  async listPosts(args: ListPostsArgs): Promise<WordPressPost[]> {
    this.logger.debug('Fetching WordPress posts', args);
    
    try {
      const params: Record<string, any> = {
        per_page: args.per_page,
        page: args.page,
        status: args.status,
        order: args.order,
        orderby: args.orderby,
      };

      if (args.search) params.search = args.search;
      if (args.author) params.author = args.author;
      if (args.categories) params.categories = args.categories.join(',');
      if (args.tags) params.tags = args.tags.join(',');
      if (args.include_content) params.context = 'edit';

      const response = await this.client.get<WordPressPost[]>('/posts', { params });
      
      this.logger.debug(`Fetched ${response.data.length} posts`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch posts', { args, error });
      throw error;
    }
  }

  async getPost(args: GetPostArgs): Promise<WordPressPost> {
    this.logger.debug('Fetching WordPress post', { id: args.id, context: args.context });
    
    try {
      const response = await this.client.get<WordPressPost>(`/posts/${args.id}`, {
        params: { context: args.context }
      });
      
      this.logger.debug(`Fetched post: ${response.data.title?.rendered || 'Untitled'}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch post', { id: args.id, error });
      throw error;
    }
  }

  // Get categories with optional pagination
  async getCategories(args?: GetCategoriesArgs): Promise<WordPressCategory[]> {
    const perPage = args?.per_page || 100;
    const page = args?.page || 1;

    this.logger.debug('Fetching WordPress categories', { perPage, page });

    try {
      const response = await this.client.get<WordPressCategory[]>('/categories', {
        params: { per_page: perPage, page, orderby: 'name', order: 'asc' }
      });

      this.logger.debug(`Fetched ${response.data.length} categories`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch categories', { error });
      throw error;
    }
  }

  // Get tags with optional pagination
  async getTags(args?: GetTagsArgs): Promise<WordPressTag[]> {
    const perPage = args?.per_page || 100;
    const page = args?.page || 1;

    this.logger.debug('Fetching WordPress tags', { perPage, page });

    try {
      const response = await this.client.get<WordPressTag[]>('/tags', {
        params: { per_page: perPage, page, orderby: 'name', order: 'asc' }
      });

      this.logger.debug(`Fetched ${response.data.length} tags`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch tags', { error });
      throw error;
    }
  }
}