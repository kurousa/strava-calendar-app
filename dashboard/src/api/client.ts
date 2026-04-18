import type { ApiResponse, DashboardSummary } from './types';

const GAS_URL = import.meta.env.VITE_GAS_URL;
const API_KEY = import.meta.env.VITE_DASHBOARD_API_KEY;

export async function fetchDashboardData(idToken: string): Promise<DashboardSummary> {
  if (!GAS_URL) {
    throw new Error('VITE_GAS_URL is not defined');
  }

  const url = new URL(GAS_URL);
  url.searchParams.append('action', 'getStats');
  url.searchParams.append('token', idToken);
  if (API_KEY) {
    url.searchParams.append('key', API_KEY);
  }

  const response = await fetch(url.toString());
  const result: ApiResponse<DashboardSummary> = await response.json();

  if (result.status === 'error') {
    throw new Error(result.message || 'Failed to fetch data');
  }

  return result.data!;
}
