export interface Partner {
  name: string;
  logo: string;
  website: string;
}

export interface SolutionPorts {
  api: number;
  ui?: number;
}

export type SolutionCategory =
  | 'AI/LLM'
  | 'Event Streaming'
  | 'Workflow Orchestration'
  | 'Semantic Search'
  | 'Data Processing';

export type SolutionStatus = 'active' | 'coming-soon' | 'beta';

export interface Solution {
  id: string;
  name: string;
  partner: Partner;
  description: string;
  longDescription?: string;
  valueProposition: string[];
  technologies: string[];
  category: SolutionCategory;
  demoUrl: string;
  sourceUrl?: string;
  documentation?: string;
  ports: SolutionPorts;
  status: SolutionStatus;
  featured?: boolean;
}

export interface SolutionFilter {
  search?: string;
  category?: SolutionCategory;
  partner?: string;
}
