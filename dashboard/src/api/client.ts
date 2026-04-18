import type { ApiResponse, DashboardSummary } from './types';

const GAS_DEPLOY_ID = import.meta.env.VITE_GAS_DEPLOY_ID;
const API_KEY = import.meta.env.VITE_DASHBOARD_API_KEY;

const getGasUrl = () => {
  if (!GAS_DEPLOY_ID) {
    throw new Error('VITE_GAS_DEPLOY_ID is not defined');
  }
  return `https://script.google.com/macros/s/${GAS_DEPLOY_ID}/exec`;
};

export async function fetchDashboardData(idToken: string): Promise<DashboardSummary> {
  const gasUrl = getGasUrl();

  const url = new URL(gasUrl);
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
