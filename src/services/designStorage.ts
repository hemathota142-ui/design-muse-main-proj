// Modular design storage service - can be swapped with API later

export interface SavedDesign {
  id: string;
  name: string;
  timestamp: number;
  data: DesignData;
  version: number;
  userId: string;
}

export interface DesignData {
  productType?: string;
  purpose?: string;
  targetUser?: string;
  environment?: string;
  skillLevel?: number;
  budget?: number;
  timeConstraint?: string;
  materials?: string[];
  tools?: string[];
  sustainabilityPriority?: boolean;
  selectedConcept?: string;
  workflowSteps?: WorkflowStep[];
  materialOptimizations?: MaterialOptimization[];
}

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  duration: string;
  tools: string[];
  completed: boolean;
}

export interface MaterialOptimization {
  id: string;
  original: string;
  alternative: string;
  costSaving: number;
  accepted: boolean;
}

const STORAGE_KEY = "smartdesign_saved_designs";

// Storage interface - implement this for different backends
interface StorageAdapter {
  getAll(userId: string): Promise<SavedDesign[]>;
  getById(id: string): Promise<SavedDesign | null>;
  save(design: SavedDesign): Promise<SavedDesign>;
  update(id: string, design: Partial<SavedDesign>): Promise<SavedDesign>;
  delete(id: string): Promise<void>;
  search(userId: string, query: string): Promise<SavedDesign[]>;
}

// LocalStorage implementation
class LocalStorageAdapter implements StorageAdapter {
  private getDesigns(): SavedDesign[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private setDesigns(designs: SavedDesign[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(designs));
  }

  async getAll(userId: string): Promise<SavedDesign[]> {
    const designs = this.getDesigns();
    return designs
      .filter((d) => d.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  async getById(id: string): Promise<SavedDesign | null> {
    const designs = this.getDesigns();
    return designs.find((d) => d.id === id) || null;
  }

  async save(design: SavedDesign): Promise<SavedDesign> {
    const designs = this.getDesigns();
    designs.push(design);
    this.setDesigns(designs);
    return design;
  }

  async update(id: string, updates: Partial<SavedDesign>): Promise<SavedDesign> {
    const designs = this.getDesigns();
    const index = designs.findIndex((d) => d.id === id);
    if (index === -1) throw new Error("Design not found");
    
    designs[index] = { ...designs[index], ...updates, timestamp: Date.now() };
    this.setDesigns(designs);
    return designs[index];
  }

  async delete(id: string): Promise<void> {
    const designs = this.getDesigns();
    const filtered = designs.filter((d) => d.id !== id);
    this.setDesigns(filtered);
  }

  async search(userId: string, query: string): Promise<SavedDesign[]> {
    const designs = await this.getAll(userId);
    const lowerQuery = query.toLowerCase();
    return designs.filter(
      (d) =>
        d.name.toLowerCase().includes(lowerQuery) ||
        d.data.productType?.toLowerCase().includes(lowerQuery) ||
        d.data.purpose?.toLowerCase().includes(lowerQuery)
    );
  }
}

// Export singleton instance - swap this for API adapter later
export const designStorage: StorageAdapter = new LocalStorageAdapter();

// Helper to create a new design
export function createDesign(
  name: string,
  data: DesignData,
  userId: string
): SavedDesign {
  return {
    id: `design_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    timestamp: Date.now(),
    data,
    version: 1,
    userId,
  };
}

// Export design as JSON
export function exportAsJSON(design: SavedDesign): string {
  return JSON.stringify(design, null, 2);
}

// Download file helper
export function downloadFile(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export design as downloadable JSON file
export function downloadDesignJSON(design: SavedDesign): void {
  const json = exportAsJSON(design);
  const filename = `${design.name.replace(/\s+/g, "_")}_v${design.version}.json`;
  downloadFile(json, filename, "application/json");
}
