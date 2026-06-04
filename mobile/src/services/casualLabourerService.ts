import apiClient from './apiClient';
import {
  CasualLabourerDto,
  CasualLabourerReportDto,
  CasualWorkSessionDto,
  CreateWorkSessionRequest,
} from '../types';

// ── Labourers ──────────────────────────────────────────────────────────────────

export async function getCasualLabourers(): Promise<CasualLabourerDto[]> {
  const res = await apiClient.get('/casual-labourers');
  return res.data.data as CasualLabourerDto[];
}

export async function addCasualLabourer(params: { name: string; phone: string | null }): Promise<CasualLabourerDto> {
  const res = await apiClient.post('/casual-labourers', params);
  return res.data.data as CasualLabourerDto;
}

export async function deactivateCasualLabourer(labourerId: number): Promise<void> {
  await apiClient.delete(`/casual-labourers/${labourerId}`);
}

// ── Work Sessions ──────────────────────────────────────────────────────────────

export async function getWorkSessions(): Promise<CasualWorkSessionDto[]> {
  const res = await apiClient.get('/casual-labourers/work-sessions');
  return res.data.data as CasualWorkSessionDto[];
}

export async function createWorkSession(request: CreateWorkSessionRequest): Promise<CasualWorkSessionDto> {
  const res = await apiClient.post('/casual-labourers/work-sessions', request);
  return res.data.data as CasualWorkSessionDto;
}

export async function updateWorkSession(sessionId: number, request: CreateWorkSessionRequest): Promise<CasualWorkSessionDto> {
  const res = await apiClient.put(`/casual-labourers/work-sessions/${sessionId}`, request);
  return res.data.data as CasualWorkSessionDto;
}

export async function deleteWorkSession(sessionId: number): Promise<void> {
  await apiClient.delete(`/casual-labourers/work-sessions/${sessionId}`);
}

// ── Summaries ──────────────────────────────────────────────────────────────────

export async function getAllSummaries(): Promise<CasualLabourerReportDto[]> {
  const res = await apiClient.get('/casual-labourers/all-summaries');
  return res.data.data as CasualLabourerReportDto[];
}

// ── Payments ───────────────────────────────────────────────────────────────────

export async function recordPayment(labourerId: number, params: {
  paymentDate: string;
  amount: number;
  note: string | null;
}): Promise<void> {
  await apiClient.post(`/casual-labourers/${labourerId}/payments`, params);
}
