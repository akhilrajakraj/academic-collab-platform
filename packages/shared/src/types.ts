export type ProjectRole = 'OWNER' | 'EDITOR' | 'REVIEWER' | 'VIEWER';
export type DocumentStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'ARCHIVED';

export interface ProjectSummary {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  documentCount: number;
  updatedAt: string;
}

export interface DocumentSummary {
  id: string;
  projectId: string;
  title: string;
  status: DocumentStatus;
  updatedAt: string;
}

export interface ApiHealth {
  status: 'ok';
  service: string;
  timestamp: string;
}
