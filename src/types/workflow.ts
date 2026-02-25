export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  duration?: string;
  effort?: "Low" | "Medium" | "High";
  completed: boolean;
  materials?: string[];
  safetyNote?: string;
}
