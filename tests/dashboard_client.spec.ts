import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('dashboard client api', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('should throw an error if VITE_GAS_DEPLOY_ID is not defined', async () => {
    vi.stubEnv('VITE_GAS_DEPLOY_ID', '');

    const { fetchDashboardData } = await import('../dashboard/src/api/client');

    await expect(fetchDashboardData('fake-token')).rejects.toThrow('VITE_GAS_DEPLOY_ID is not defined');
  });

  it('should fetch dashboard data successfully', async () => {
    vi.stubEnv('VITE_GAS_DEPLOY_ID', 'test-deploy-id');

    const mockResponse = {
      status: 'success',
      code: 200,
      data: { fitness: 100 }
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockResponse)
    }));

    const { fetchDashboardData } = await import('../dashboard/src/api/client');
    const result = await fetchDashboardData('fake-token');

    expect(result).toEqual({ fitness: 100 });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('https://script.google.com/macros/s/test-deploy-id/exec'));
  });

  it('should throw an error if the API returns an error status with a message', async () => {
    vi.stubEnv('VITE_GAS_DEPLOY_ID', 'test-deploy-id');

    const mockResponse = {
      status: 'error',
      message: 'Custom error from API'
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockResponse)
    }));

    const { fetchDashboardData } = await import('../dashboard/src/api/client');
    await expect(fetchDashboardData('fake-token')).rejects.toThrow('Custom error from API');
  });

  it('should throw a default error if the API returns an error status without a message', async () => {
    vi.stubEnv('VITE_GAS_DEPLOY_ID', 'test-deploy-id');

    const mockResponse = {
      status: 'error'
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockResponse)
    }));

    const { fetchDashboardData } = await import('../dashboard/src/api/client');
    await expect(fetchDashboardData('fake-token')).rejects.toThrow('Failed to fetch data');
  });
});
