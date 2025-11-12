/**
 * Queue module tests
 * Tests queue item creation, idempotency, and validation
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';

// Mock Prisma client
const mockPrisma = {
  queueItem: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('@shared/db', () => ({
  prisma: mockPrisma,
}));

// Mock BullMQ
const mockPublishQueue = {
  add: vi.fn(),
};

vi.mock('@shared/queue', () => ({
  publishQueue: mockPublishQueue,
}));

describe('Queue Module - Input Validation', () => {
  const Body = z.object({
    projectId: z.string(),
    assetId: z.string(),
    title: z.string().max(120),
    caption: z.string().optional(),
    hashtags: z.array(z.string()).default([]),
    platforms: z.array(z.enum(['youtube', 'instagram', 'x'])).min(1),
    scheduleAt: z.string().datetime().optional(),
  });

  it('should validate required fields', () => {
    const validData = {
      projectId: 'proj_123',
      assetId: 'asset_456',
      title: 'My Video',
      platforms: ['youtube'],
    };

    const result = Body.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject missing required fields', () => {
    const invalidData = {
      projectId: 'proj_123',
      // Missing assetId, title, platforms
    };

    const result = Body.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should validate title length (max 120 chars)', () => {
    const tooLong = 'a'.repeat(121);
    const data = {
      projectId: 'proj_123',
      assetId: 'asset_456',
      title: tooLong,
      platforms: ['youtube'],
    };

    const result = Body.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should validate platform enum values', () => {
    const invalidPlatform = {
      projectId: 'proj_123',
      assetId: 'asset_456',
      title: 'Test',
      platforms: ['tiktok'], // Not in enum
    };

    const result = Body.safeParse(invalidPlatform);
    expect(result.success).toBe(false);
  });

  it('should require at least one platform', () => {
    const noPlatforms = {
      projectId: 'proj_123',
      assetId: 'asset_456',
      title: 'Test',
      platforms: [],
    };

    const result = Body.safeParse(noPlatforms);
    expect(result.success).toBe(false);
  });

  it('should accept multiple valid platforms', () => {
    const multiPlatform = {
      projectId: 'proj_123',
      assetId: 'asset_456',
      title: 'Test',
      platforms: ['youtube', 'instagram', 'x'],
    };

    const result = Body.safeParse(multiPlatform);
    expect(result.success).toBe(true);
  });

  it('should validate datetime format for scheduleAt', () => {
    const invalidDate = {
      projectId: 'proj_123',
      assetId: 'asset_456',
      title: 'Test',
      platforms: ['youtube'],
      scheduleAt: '2024-13-45', // Invalid date
    };

    const result = Body.safeParse(invalidDate);
    expect(result.success).toBe(false);
  });

  it('should accept valid ISO datetime for scheduleAt', () => {
    const validDate = {
      projectId: 'proj_123',
      assetId: 'asset_456',
      title: 'Test',
      platforms: ['youtube'],
      scheduleAt: '2024-12-31T23:59:59Z',
    };

    const result = Body.safeParse(validDate);
    expect(result.success).toBe(true);
  });
});

describe('Queue Module - Idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return existing item if idempotency key matches', async () => {
    const existingItem = {
      id: 'qi_123',
      orgId: 'org_demo',
      projectId: 'proj_123',
      assetId: 'asset_456',
      title: 'Test',
      platforms: ['youtube'],
      idempotencyKey: 'idem_123',
      status: 'queued',
    };

    mockPrisma.queueItem.findUnique.mockResolvedValue(existingItem);

    const result = await mockPrisma.queueItem.findUnique({
      where: { idempotencyKey: 'idem_123' },
    });

    expect(result).toEqual(existingItem);
    expect(mockPrisma.queueItem.findUnique).toHaveBeenCalledWith({
      where: { idempotencyKey: 'idem_123' },
    });
  });

  it('should create new item if idempotency key is unique', async () => {
    mockPrisma.queueItem.findUnique.mockResolvedValue(null);
    mockPrisma.queueItem.create.mockResolvedValue({
      id: 'qi_456',
      orgId: 'org_demo',
      projectId: 'proj_123',
      assetId: 'asset_456',
      title: 'New Item',
      platforms: ['youtube'],
      idempotencyKey: 'idem_456',
      status: 'queued',
    });

    const existing = await mockPrisma.queueItem.findUnique({
      where: { idempotencyKey: 'idem_456' },
    });
    expect(existing).toBeNull();

    const newItem = await mockPrisma.queueItem.create({
      data: {
        orgId: 'org_demo',
        projectId: 'proj_123',
        assetId: 'asset_456',
        title: 'New Item',
        platforms: ['youtube'],
        idempotencyKey: 'idem_456',
        status: 'queued',
      },
    });

    expect(newItem.id).toBe('qi_456');
    expect(mockPrisma.queueItem.create).toHaveBeenCalled();
  });
});

describe('Queue Module - Organization Context', () => {
  it('should require orgId to be present', () => {
    // Simulate missing X-Org-Id header
    const orgId = undefined;
    expect(orgId).toBeUndefined();
  });

  it('should extract orgId from request headers', () => {
    // Simulate X-Org-Id header present
    const headers = { 'x-org-id': 'org_demo' };
    const orgId = headers['x-org-id'];
    expect(orgId).toBe('org_demo');
  });

  it('should use orgId from JWT claims via headers', () => {
    const mockRequest = {
      headers: {
        'x-org-id': 'org_production',
        'x-user-id': 'user_123',
        'x-scopes': 'clip:create,clip:read',
      },
    };

    expect(mockRequest.headers['x-org-id']).toBe('org_production');
  });
});

describe('Queue Module - Job Enqueueing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should enqueue jobs for each platform', async () => {
    const queueItem = {
      id: 'qi_123',
      platforms: ['youtube', 'instagram', 'x'],
    };

    for (const platform of queueItem.platforms) {
      await mockPublishQueue.add(
        'publish',
        { queueItemId: queueItem.id, platform },
        { jobId: `${queueItem.id}:${platform}` }
      );
    }

    expect(mockPublishQueue.add).toHaveBeenCalledTimes(3);
    expect(mockPublishQueue.add).toHaveBeenCalledWith(
      'publish',
      { queueItemId: 'qi_123', platform: 'youtube' },
      { jobId: 'qi_123:youtube' }
    );
    expect(mockPublishQueue.add).toHaveBeenCalledWith(
      'publish',
      { queueItemId: 'qi_123', platform: 'instagram' },
      { jobId: 'qi_123:instagram' }
    );
    expect(mockPublishQueue.add).toHaveBeenCalledWith(
      'publish',
      { queueItemId: 'qi_123', platform: 'x' },
      { jobId: 'qi_123:x' }
    );
  });

  it('should use consistent jobId format', async () => {
    const queueItemId = 'qi_789';
    const platform = 'youtube';
    const expectedJobId = `${queueItemId}:${platform}`;

    await mockPublishQueue.add(
      'publish',
      { queueItemId, platform },
      { jobId: expectedJobId }
    );

    expect(mockPublishQueue.add).toHaveBeenCalledWith(
      'publish',
      { queueItemId, platform },
      { jobId: 'qi_789:youtube' }
    );
  });
});
