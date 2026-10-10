import { apiClient } from './client';

export interface ReadingSessionRequest {
  groupId?: string;
  bookId?: string;
  bookTitle?: string;
  sessionType?: 'STOPWATCH' | 'TIMER';
  durationSeconds: number;
  startedAt: string; // ISO string
  endedAt: string; // ISO string
}

export interface ReadingSessionResponse {
  id: string;
  userId: string;
  groupId?: string;
  bookId?: string;
  bookTitle?: string;
  sessionType: string;
  durationSeconds: number;
  startedAt: string;
  endedAt: string;
  createdAt: string;
}

export interface UserReadingStats {
  totalReadingSeconds: number;
  todayReadingSeconds: number;
  weekReadingSeconds: number;
  monthReadingSeconds: number;
  allowGroupInvites: boolean;
}

export interface ReadingGroup {
  id: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  isPublic: boolean;
  creatorId: string;
  creatorName?: string;
  creatorAvatarUrl?: string;
  maxMembers: number;
  memberCount: number;
  isMember: boolean;
  myRole?: 'CREATOR' | 'ADMIN' | 'MEMBER';
  myTodaySeconds?: number;
  myMonthlySeconds: number;
  myTotalSeconds: number;
  createdAt: string;
}

export interface ReadingGroupMember {
  id: string;
  userId: string;
  name: string;
  username?: string;
  email?: string;
  avatarUrl?: string;
  role: 'CREATOR' | 'ADMIN' | 'MEMBER';
  todayReadingSeconds?: number;
  monthlyReadingSeconds: number;
  totalReadingSeconds: number;
  rank: number;
  joinedAt: string;
}

export interface ReadingGroupArchive {
  id: string;
  yearMonth: string;
  winnerUserId?: string;
  winnerName?: string;
  winnerReadingSeconds: number;
  totalGroupReadingSeconds: number;
  createdAt: string;
}

export interface ReadingGroupDetail {
  group: ReadingGroup;
  members: ReadingGroupMember[];
  archives: ReadingGroupArchive[];
}

export interface ReadingGroupCreateRequest {
  name: string;
  description?: string;
  coverImageUrl?: string;
  isPublic?: boolean;
  inviteeEmails?: string[];
}

export interface ReadingGroupUpdateRequest {
  name?: string;
  description?: string;
  coverImageUrl?: string;
  isPublic?: boolean;
}

export interface ReadingGroupInvitation {
  id: string;
  groupId: string;
  groupName?: string;
  groupDescription?: string;
  groupCoverImageUrl?: string;
  inviterId: string;
  inviterName?: string;
  inviterAvatarUrl?: string;
  inviteeEmail: string;
  token: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  createdAt: string;
  expiresAt: string;
}

export interface UserSearchResult {
  id: string;
  name: string;
  username?: string;
  email: string;
  avatarUrl?: string;
  allowGroupInvites: boolean;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const paraqtaApi = {
  // Reading Tracker
  saveSession: async (data: ReadingSessionRequest): Promise<ReadingSessionResponse> => {
    const res = await apiClient.post<ReadingSessionResponse>('/api/v1/reading-tracker/sessions', data);
    return res.data;
  },

  getStats: async (): Promise<UserReadingStats> => {
    const res = await apiClient.get<UserReadingStats>('/api/v1/reading-tracker/stats');
    return res.data;
  },

  updateInviteSetting: async (allowGroupInvites: boolean): Promise<{ success: boolean; allowGroupInvites: boolean }> => {
    const res = await apiClient.put<{ success: boolean; allowGroupInvites: boolean }>('/api/v1/reading-tracker/invite-setting', {
      allowGroupInvites,
    });
    return res.data;
  },

  getSessions: async (page = 0, size = 20): Promise<PageResponse<ReadingSessionResponse>> => {
    const res = await apiClient.get<PageResponse<ReadingSessionResponse>>('/api/v1/reading-tracker/sessions', {
      params: { page, size },
    });
    return res.data;
  },

  // Reading Groups
  createGroup: async (data: ReadingGroupCreateRequest): Promise<ReadingGroup> => {
    const res = await apiClient.post<ReadingGroup>('/api/v1/reading-groups', data);
    return res.data;
  },

  updateGroup: async (id: string, data: ReadingGroupUpdateRequest): Promise<ReadingGroup> => {
    const res = await apiClient.put<ReadingGroup>(`/api/v1/reading-groups/${id}`, data);
    return res.data;
  },

  deleteGroup: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/api/v1/reading-groups/${id}`);
    return res.data;
  },

  getPublicGroups: async (query?: string, page = 0, size = 20): Promise<PageResponse<ReadingGroup>> => {
    const res = await apiClient.get<PageResponse<ReadingGroup>>('/api/v1/reading-groups/public', {
      params: { query, page, size },
    });
    return res.data;
  },

  getMyGroups: async (): Promise<ReadingGroup[]> => {
    const res = await apiClient.get<ReadingGroup[]>('/api/v1/reading-groups/my');
    return res.data;
  },

  getGroupDetail: async (id: string): Promise<ReadingGroupDetail> => {
    const res = await apiClient.get<ReadingGroupDetail>(`/api/v1/reading-groups/${id}`);
    return res.data;
  },

  joinGroup: async (id: string): Promise<ReadingGroup> => {
    const res = await apiClient.post<ReadingGroup>(`/api/v1/reading-groups/${id}/join`);
    return res.data;
  },

  leaveGroup: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string }>(`/api/v1/reading-groups/${id}/leave`);
    return res.data;
  },

  kickMember: async (groupId: string, userId: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string }>(`/api/v1/reading-groups/${groupId}/kick/${userId}`);
    return res.data;
  },

  sendInvitation: async (groupId: string, email: string): Promise<ReadingGroupInvitation> => {
    const res = await apiClient.post<ReadingGroupInvitation>(`/api/v1/reading-groups/${groupId}/invitations`, { email });
    return res.data;
  },

  getMyInvitations: async (): Promise<ReadingGroupInvitation[]> => {
    const res = await apiClient.get<ReadingGroupInvitation[]>('/api/v1/reading-groups/invitations/my');
    return res.data;
  },

  acceptInvitation: async (token: string): Promise<ReadingGroup> => {
    const res = await apiClient.post<ReadingGroup>(`/api/v1/reading-groups/invitations/${token}/accept`);
    return res.data;
  },

  rejectInvitation: async (token: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string }>(`/api/v1/reading-groups/invitations/${token}/reject`);
    return res.data;
  },

  searchUsers: async (query: string): Promise<UserSearchResult[]> => {
    const res = await apiClient.get<UserSearchResult[]>('/api/v1/reading-groups/users/search', {
      params: { query },
    });
    return res.data;
  },
};
