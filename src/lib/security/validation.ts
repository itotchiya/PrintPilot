import { z } from 'zod';

/**
 * Security Validation Schemas
 * 
 * Input validation schemas for security hardening
 */

// Email validation with stricter rules
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .max(254, 'Email too long')
  .email('Invalid email format')
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format')
  .transform((email) => email.toLowerCase().trim());

// Password validation with strong requirements
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Company name validation
export const companyNameSchema = z
  .string()
  .min(2, 'Company name must be at least 2 characters')
  .max(100, 'Company name too long')
  .regex(/^[\w\s\-&.,()]+$/, 'Company name contains invalid characters');

// Token validation
export const tokenSchema = z
  .string()
  .min(10, 'Invalid token')
  .max(255, 'Invalid token')
  .regex(/^[A-Za-z0-9_-]+$/, 'Invalid token format');

// UUID validation
export const uuidSchema = z
  .string()
  .regex(/^[cuid_][a-z0-9_-]+$/i, 'Invalid ID format');

// File upload validation helpers
export const FileValidation = {
  // Maximum file sizes
  maxSizes: {
    logo: 5 * 1024 * 1024, // 5MB
    document: 10 * 1024 * 1024, // 10MB
    excel: 2 * 1024 * 1024, // 2MB
  },

  // Allowed MIME types
  allowedTypes: {
    logo: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    excel: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ],
  },

  // File extension validation
  allowedExtensions: {
    logo: ['.png', '.jpg', '.jpeg', '.svg', '.webp'],
    document: ['.pdf', '.doc', '.docx'],
    excel: ['.xls', '.xlsx', '.csv'],
  },

  /**
   * Validate a file upload
   */
  validateFile(
    file: File,
    type: 'logo' | 'document' | 'excel'
  ): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > this.maxSizes[type]) {
      return {
        valid: false,
        error: `File too large. Maximum size is ${this.maxSizes[type] / (1024 * 1024)}MB`,
      };
    }

    // Check MIME type
    if (!this.allowedTypes[type].includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed types: ${this.allowedTypes[type].join(', ')}`,
      };
    }

    // Check extension
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!this.allowedExtensions[type].includes(extension)) {
      return {
        valid: false,
        error: `Invalid file extension. Allowed: ${this.allowedExtensions[type].join(', ')}`,
      };
    }

    // Additional security: check for null bytes in filename
    if (file.name.includes('\0')) {
      return {
        valid: false,
        error: 'Invalid filename',
      };
    }

    return { valid: true };
  },

  /**
   * Sanitize filename
   */
  sanitizeFilename(filename: string): string {
    // Remove path traversal attempts
    const sanitized = filename
      .replace(/\\/g, '/')
      .split('/')
      .pop() || '';
    
    // Remove dangerous characters
    return sanitized
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 100);
  },
};

// Input sanitization helpers
export const Sanitization = {
  /**
   * Sanitize a string input
   */
  string(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .substring(0, 1000); // Limit length
  },

  /**
   * Sanitize a text input (allows more characters)
   */
  text(input: string): string {
    return input
      .trim()
      .substring(0, 5000); // Limit length
  },

  /**
   * Sanitize HTML content (if needed)
   */
  html(input: string): string {
    // Basic HTML sanitization - for production, use DOMPurify
    return input
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .substring(0, 10000);
  },

  /**
   * Validate and sanitize a URL
   */
  url(input: string): string | null {
    try {
      const url = new URL(input);
      // Only allow http and https
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return null;
      }
      return url.toString();
    } catch {
      return null;
    }
  },
};

// Rate limit key generation helpers
export const RateLimitKeys = {
  /**
   * Get rate limit key for IP address
   */
  byIp(ip: string | null): string {
    return ip || 'unknown';
  },

  /**
   * Get rate limit key for user
   */
  byUser(userId: string): string {
    return `user:${userId}`;
  },

  /**
   * Get rate limit key for combination
   */
  byCombo(ip: string | null, userId?: string): string {
    if (userId) {
      return `combo:${userId}:${ip || 'unknown'}`;
    }
    return `ip:${ip || 'unknown'}`;
  },
};
