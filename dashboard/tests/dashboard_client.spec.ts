import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('fetchDashboardData', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('should throw error when VITE_GAS_DEPLOY_ID is not defined', async () => {
    // Ensure it's undefined
    vi.stubEnv('VITE_GAS_DEPLOY_ID', '');

    // We need to import the module after stubbing the environment variable
    // because GAS_DEPLOY_ID is initialized at the top level.
    const { fetchDashboardData } = await import('../src/api/client');

    await expect(fetchDashboardData('token')).rejects.toThrow('VITE_GAS_DEPLOY_ID is not defined');
  });

  it('should call fetch with correct URL when VITE_GAS_DEPLOY_ID is defined', async () => {
    const deployId = 'test-deploy-id';
    vi.stubEnv('VITE_GAS_DEPLOY_ID', deployId);

    const mockResponse = {
      status: 'success',
      data: {
        lastActivity: null,
        fitness: 0,
        gears: [],
        history: []
      }
    };

    (global.fetch as any).mockResolvedValue({
      json: () => Promise.resolve(mockResponse)
    });

    const { fetchDashboardData } = await import('../src/api/client');
    const result = await fetchDashboardData('fake-token');

    expect(result).toEqual(mockResponse.data);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`https://script.google.com/macros/s/${deployId}/exec`)
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('action=getStats')
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('token=fake-token')
    );
  });

  it('should throw error when API returns error status', async () => {
    vi.stubEnv('VITE_GAS_DEPLOY_ID', 'test-id');

    const mockErrorResponse = {
      status: 'error',
      message: 'Invalid token'
    };

    (global.fetch as any).mockResolvedValue({
      json: () => Promise.resolve(mockErrorResponse)
    });

    const { fetchDashboardData } = await import('../src/api/client');

    await expect(fetchDashboardData('invalid-token')).rejects.toThrow('Invalid token');
  });

  it('should throw default error message when API returns error status without message', async () => {
    vi.stubEnv('VITE_GAS_DEPLOY_ID', 'test-id');

    const mockErrorResponse = {
      status: 'error'
    };

    (global.fetch as any).mockResolvedValue({
      json: () => Promise.resolve(mockErrorResponse)
    });

    const { fetchDashboardData } = await import('../src/api/client');

    await expect(fetchDashboardData('token')).rejects.toThrow('Failed to fetch data');
  });
});
