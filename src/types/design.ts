export type DesignVisibility = "public" | "private";

export interface DesignStep {
  id: string;
  title: string;
  description: string;
  duration?: string;
  effort?: string;
  materials?: string[];
  tools?: string[];
  completed?: boolean;
  safetyNote?: string;
}

export interface Design {
  id: string;
  user_id: string | null;
  title: string;
  product_name: string;
  product_type: string;
  purpose: string;
  target_user: string;
  environment: string;
  skill_level: string;
  budget: number;
  time_available: string;
  safety_constraints: string;
  materials: string[];
  tools: string[];
  sustainability: boolean;
  estimated_cost: number | null;
  steps: DesignStep[];
  visibility: DesignVisibility;
  created_at: string;
}
