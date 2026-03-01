import { ensureGuestSession, getGuestSessionId, guestStorageKey } from "@/lib/guestSession";

// Modular design storage service - can be swapped with API later

export interface SavedDesign {
  id: string;
  name: string;
  timestamp: number;
  data: DesignData;
  version: number;
  userId: string;
  created_at?: string;
  visibility?: "public" | "private";
  designDraft?: any;
  canonicalDesign?: any;
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
  designDraft?: any;
  visibility?: "public" | "private";
  created_at?: string;
  canonicalDesign?: any;
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

const STORAGE_KEY_PREFIX = "smartdesign_saved_designs";
const GUEST_STORAGE_NAME = "saved_designs";

// Storage interface - implement this for different backends
interface StorageAdapter {
  getAll(userId: string): Promise<SavedDesign[]>;
  getById(userId: string, id: string): Promise<SavedDesign | null>;
  save(userId: string, design: SavedDesign): Promise<SavedDesign>;
  update(userId: string, id: string, design: Partial<SavedDesign>): Promise<SavedDesign>;
  delete(userId: string, id: string): Promise<void>;
  search(userId: string, query: string): Promise<SavedDesign[]>;
}

// LocalStorage implementation
class LocalStorageAdapter implements StorageAdapter {
  private getStorageKey(userId: string): string {
    return `${STORAGE_KEY_PREFIX}_${userId}`;
  }

  private getDesigns(userId: string): SavedDesign[] {
    const data = localStorage.getItem(this.getStorageKey(userId));
    return data ? JSON.parse(data) : [];
  }

  private setDesigns(userId: string, designs: SavedDesign[]): void {
    localStorage.setItem(this.getStorageKey(userId), JSON.stringify(designs));
  }

  async getAll(userId: string): Promise<SavedDesign[]> {
    const designs = this.getDesigns(userId);
    return designs.sort((a, b) => b.timestamp - a.timestamp);
  }

  async getById(userId: string, id: string): Promise<SavedDesign | null> {
    const designs = this.getDesigns(userId);
    return designs.find((d) => d.id === id) || null;
  }

  async save(userId: string, design: SavedDesign): Promise<SavedDesign> {
    const designs = this.getDesigns(userId);
    designs.push(design);
    this.setDesigns(userId, designs);
    return design;
  }

  async update(
    userId: string,
    id: string,
    updates: Partial<SavedDesign>
  ): Promise<SavedDesign> {
    const designs = this.getDesigns(userId);
    const index = designs.findIndex((d) => d.id === id);
    if (index === -1) throw new Error("Design not found");
    
    designs[index] = { ...designs[index], ...updates, timestamp: Date.now() };
    this.setDesigns(userId, designs);
    return designs[index];
  }

  async delete(userId: string, id: string): Promise<void> {
    const designs = this.getDesigns(userId);
    const filtered = designs.filter((d) => d.id !== id);
    this.setDesigns(userId, filtered);
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

class SessionStorageAdapter implements StorageAdapter {
  private getStorageKey(userId: string): string {
    return guestStorageKey(GUEST_STORAGE_NAME, userId);
  }

  private getDesigns(userId: string): SavedDesign[] {
    const data = sessionStorage.getItem(this.getStorageKey(userId));
    return data ? JSON.parse(data) : [];
  }

  private setDesigns(userId: string, designs: SavedDesign[]): void {
    sessionStorage.setItem(this.getStorageKey(userId), JSON.stringify(designs));
  }

  async getAll(userId: string): Promise<SavedDesign[]> {
    const designs = this.getDesigns(userId);
    return designs.sort((a, b) => b.timestamp - a.timestamp);
  }

  async getById(userId: string, id: string): Promise<SavedDesign | null> {
    const designs = this.getDesigns(userId);
    return designs.find((d) => d.id === id) || null;
  }

  async save(userId: string, design: SavedDesign): Promise<SavedDesign> {
    const designs = this.getDesigns(userId);
    designs.push(design);
    this.setDesigns(userId, designs);
    return design;
  }

  async update(
    userId: string,
    id: string,
    updates: Partial<SavedDesign>
  ): Promise<SavedDesign> {
    const designs = this.getDesigns(userId);
    const index = designs.findIndex((d) => d.id === id);
    if (index === -1) throw new Error("Design not found");

    designs[index] = { ...designs[index], ...updates, timestamp: Date.now() };
    this.setDesigns(userId, designs);
    return designs[index];
  }

  async delete(userId: string, id: string): Promise<void> {
    const designs = this.getDesigns(userId);
    const filtered = designs.filter((d) => d.id !== id);
    this.setDesigns(userId, filtered);
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
const guestDesignStorage: StorageAdapter = new SessionStorageAdapter();

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

export async function saveGuestDesign(params: {
  designDraft: {
    title: string;
    workflow: any[];
    constraints: any;
    description?: string;
    feasibilityScore?: number | null;
  };
  canonicalDesign?: any;
  visibility: "public" | "private";
  status?: string;
}) {
  const sessionId = ensureGuestSession();
  if (!sessionId) {
    throw new Error("Guest session unavailable");
  }
  const created_at = new Date().toISOString();
  const name = params.designDraft.title;

  const design = createDesign(
    name,
    {
      designDraft: params.designDraft,
      canonicalDesign: params.canonicalDesign,
      visibility: params.visibility,
      created_at,
    },
    sessionId
  );

  design.created_at = created_at;
  design.visibility = params.visibility;
  design.designDraft = {
    ...params.designDraft,
    status: params.status ?? "saved",
  };
  const canonicalWithIds = params.canonicalDesign
    ? { ...params.canonicalDesign, id: design.id, created_at }
    : undefined;

  design.canonicalDesign = canonicalWithIds;
  design.data.canonicalDesign = canonicalWithIds;

  return guestDesignStorage.save(sessionId, design);
}

export async function getGuestDesigns() {
  const sessionId = getGuestSessionId();
  if (!sessionId) return [];
  return guestDesignStorage.getAll(sessionId);
}

export async function getGuestDesignById(id: string) {
  const sessionId = getGuestSessionId();
  if (!sessionId) return null;
  return guestDesignStorage.getById(sessionId, id);
}

export async function deleteGuestDesign(id: string) {
  const sessionId = getGuestSessionId();
  if (!sessionId) return;
  await guestDesignStorage.delete(sessionId, id);
}

export async function updateGuestDesign(id: string, updates: Partial<SavedDesign>) {
  const sessionId = getGuestSessionId();
  if (!sessionId) {
    throw new Error("Guest session unavailable");
  }
  return guestDesignStorage.update(sessionId, id, updates);
}

export async function saveGuestDesignRecord(design: SavedDesign) {
  const sessionId = getGuestSessionId();
  if (!sessionId) {
    throw new Error("Guest session unavailable");
  }
  return guestDesignStorage.save(sessionId, design);
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
