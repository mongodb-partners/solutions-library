/**
 * Solution types for admin dashboard.
 */

export interface PartnerInfo {
  name: string;
  logo: string;
  website: string;
}

export interface PortMapping {
  api?: number;
  ui?: number;
}

export interface SolutionListItem {
  id: string;
  name: string;
  partner_name: string;
  partner_logo: string;
  description: string;
  category: string;
  status: 'active' | 'inactive' | 'coming-soon';
  featured: boolean;
  demo_url: string;
  source_url: string;
  technologies: string[];
}

export interface SolutionDetail {
  id: string;
  name: string;
  partner: PartnerInfo;
  description: string;
  longDescription?: string;
  valueProposition: string[];
  technologies: string[];
  category: string;
  demoUrl: string;
  sourceUrl: string;
  documentation?: string;
  ports?: PortMapping;
  status: string;
  featured: boolean;
  reference?: string;
  container_status?: string;
  last_checked?: string;
}

export interface SolutionsListResponse {
  solutions: SolutionListItem[];
  total: number;
  categories: string[];
}

export interface CategoryCount {
  name: string;
  count: number;
}

export type SolutionStatus = 'active' | 'inactive' | 'maintenance';
export type ContainerStatus = 'running' | 'stopped' | 'not_configured';
