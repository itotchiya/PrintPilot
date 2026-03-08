import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { POST as createInvitation } from '@/app/api/invitations/route';
import { GET as getInvitation } from '@/app/api/invitations/[token]/route';
import { POST as acceptInvitation } from '@/app/api/invitations/[token]/accept/route';

// Mock NextRequest
function createMockRequest(body: unknown, query: Record<string, string> = {}) {
  return {
    json: () => Promise.resolve(body),
    url: `http://localhost:3000/api/test?${new URLSearchParams(query).toString()}`,
  } as Request;
}

// Mock params for dynamic routes
function createMockParams(params: Record<string, string>) {
  return Promise.resolve(params);
}

describe('Invitation Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/invitations - Create Invitation', () => {
    it('should create a supplier invitation successfully', async () => {
      const mockInvitation = {
        id: 'inv_123',
        email: 'supplier@test.com',
        token: 'token_abc',
        type: 'SUPPLIER',
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      vi.mocked(prisma.invitation.create).mockResolvedValue(mockInvitation as any);

      const request = createMockRequest({
        email: 'supplier@test.com',
        type: 'SUPPLIER',
        companyName: 'Test Supplier',
      });

      const response = await createInvitation(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.invitation.token).toBeDefined();
    });

    it('should validate email format', async () => {
      const request = createMockRequest({
        email: 'invalid-email',
        type: 'SUPPLIER',
      });

      const response = await createInvitation(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('email');
    });

    it('should require email field', async () => {
      const request = createMockRequest({
        type: 'SUPPLIER',
      });

      const response = await createInvitation(request);

      expect(response.status).toBe(400);
    });

    it('should create a client invitation with supplierId', async () => {
      const mockInvitation = {
        id: 'inv_456',
        email: 'client@test.com',
        token: 'token_xyz',
        type: 'CLIENT',
        supplierId: 'sup_123',
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      vi.mocked(prisma.invitation.create).mockResolvedValue(mockInvitation as any);

      const request = createMockRequest({
        email: 'client@test.com',
        type: 'CLIENT',
        supplierId: 'sup_123',
      });

      const response = await createInvitation(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.invitation.type).toBe('CLIENT');
    });
  });

  describe('GET /api/invitations/[token] - Get Invitation', () => {
    it('should return invitation details for valid token', async () => {
      const mockInvitation = {
        id: 'inv_123',
        email: 'test@test.com',
        type: 'SUPPLIER',
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        supplier: {
          companyName: 'Test Supplier',
        },
      };

      vi.mocked(prisma.invitation.findUnique).mockResolvedValue(mockInvitation as any);

      const request = createMockRequest({});
      const params = createMockParams({ token: 'valid_token' });

      const response = await getInvitation(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invitation.email).toBe('test@test.com');
    });

    it('should return 404 for invalid token', async () => {
      vi.mocked(prisma.invitation.findUnique).mockResolvedValue(null);

      const request = createMockRequest({});
      const params = createMockParams({ token: 'invalid_token' });

      const response = await getInvitation(request, { params });

      expect(response.status).toBe(404);
    });

    it('should return 400 for expired invitation', async () => {
      const mockInvitation = {
        id: 'inv_123',
        email: 'test@test.com',
        type: 'SUPPLIER',
        status: 'pending',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired
      };

      vi.mocked(prisma.invitation.findUnique).mockResolvedValue(mockInvitation as any);

      const request = createMockRequest({});
      const params = createMockParams({ token: 'expired_token' });

      const response = await getInvitation(request, { params });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/invitations/[token]/accept - Accept Invitation', () => {
    it('should accept invitation and create user account', async () => {
      const mockInvitation = {
        id: 'inv_123',
        email: 'test@test.com',
        type: 'SUPPLIER',
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      const mockUser = {
        id: 'user_123',
        email: 'test@test.com',
        name: 'Test User',
        role: 'SUPER_ADMIN',
      };

      vi.mocked(prisma.invitation.findUnique).mockResolvedValue(mockInvitation as any);
      vi.mocked(prisma.user.create).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.invitation.update).mockResolvedValue({ ...mockInvitation, status: 'accepted' } as any);

      const request = createMockRequest({
        name: 'Test User',
        password: 'securePassword123',
      });
      const params = createMockParams({ token: 'valid_token' });

      const response = await acceptInvitation(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.id).toBeDefined();
    });

    it('should require password of minimum length', async () => {
      const mockInvitation = {
        id: 'inv_123',
        email: 'test@test.com',
        type: 'SUPPLIER',
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      vi.mocked(prisma.invitation.findUnique).mockResolvedValue(mockInvitation as any);

      const request = createMockRequest({
        name: 'Test User',
        password: '123', // Too short
      });
      const params = createMockParams({ token: 'valid_token' });

      const response = await acceptInvitation(request, { params });

      expect(response.status).toBe(400);
    });

    it('should handle already accepted invitations', async () => {
      const mockInvitation = {
        id: 'inv_123',
        email: 'test@test.com',
        type: 'SUPPLIER',
        status: 'accepted',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      vi.mocked(prisma.invitation.findUnique).mockResolvedValue(mockInvitation as any);

      const request = createMockRequest({
        name: 'Test User',
        password: 'securePassword123',
      });
      const params = createMockParams({ token: 'accepted_token' });

      const response = await acceptInvitation(request, { params });

      expect(response.status).toBe(400);
    });
  });
});
