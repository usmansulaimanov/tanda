import { apiClient } from './client';

export interface CertificateItem {
  id: string;
  certificateNumber: string;
  recipientName: string;
  recipientUserId?: string;
  recipientIdNumber?: string;
  title: string;
  description?: string;
  category: string;
  issuedAt: string;
  issuerName: string;
  pdfUrl?: string;
  imageUrl?: string;
  status: 'ACTIVE' | 'REVOKED' | string;
  verificationToken?: string;
  verificationUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface CertificateFormData {
  certificateNumber: string;
  recipientName: string;
  recipientUserId?: string;
  recipientIdNumber?: string;
  title: string;
  description?: string;
  category?: string;
  issuedAt: string;
  issuerName?: string;
  pdfUrl?: string;
  imageUrl?: string;
  status?: string;
}

export const certificatesApi = {
  // Admin Endpoints
  getAll: async (query?: string): Promise<CertificateItem[]> => {
    const { data } = await apiClient.get<CertificateItem[]>('/api/v1/admin/certificates', {
      params: query ? { q: query } : undefined,
    });
    return data;
  },

  getById: async (id: string): Promise<CertificateItem> => {
    const { data } = await apiClient.get<CertificateItem>(`/api/v1/admin/certificates/${id}`);
    return data;
  },

  getNextNumber: async (): Promise<{ nextNumber: string }> => {
    const { data } = await apiClient.get<{ nextNumber: string }>('/api/v1/admin/certificates/next-number');
    return data;
  },

  checkNumber: async (number: string, excludeId?: string): Promise<{ available: boolean; message: string }> => {
    const { data } = await apiClient.get<{ available: boolean; message: string }>(
      '/api/v1/admin/certificates/check-number',
      { params: { number, excludeId } }
    );
    return data;
  },

  create: async (formData: CertificateFormData): Promise<CertificateItem> => {
    const { data } = await apiClient.post<CertificateItem>('/api/v1/admin/certificates', formData);
    return data;
  },

  update: async (id: string, formData: CertificateFormData): Promise<CertificateItem> => {
    const { data } = await apiClient.put<CertificateItem>(`/api/v1/admin/certificates/${id}`, formData);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/admin/certificates/${id}`);
  },

  // Public Endpoint
  verify: async (certificateNumber: string, key?: string | null): Promise<CertificateItem> => {
    const { data } = await apiClient.get<CertificateItem>(
      `/api/v1/certificates/verify/${encodeURIComponent(certificateNumber)}`,
      {
        params: key ? { key } : undefined,
      }
    );
    return data;
  },
};
