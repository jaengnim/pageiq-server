import { analyses, type Analysis, type InsertAnalysis } from "@shared/schema";

export interface IStorage {
  createAnalysis(data: InsertAnalysis): Promise<Analysis>;
  getAnalysis(id: number): Promise<Analysis | undefined>;
  updateAnalysis(id: number, data: Partial<Analysis>): Promise<Analysis>;
}

export class MemStorage implements IStorage {
  private analyses: Map<number, Analysis> = new Map();
  private nextId = 1;

  async createAnalysis(data: InsertAnalysis): Promise<Analysis> {
    const analysis: Analysis = {
      id: this.nextId++,
      url: data.url,
      status: data.status || "pending",
      result: data.result || null,
      createdAt: new Date(),
    };
    this.analyses.set(analysis.id, analysis);
    return analysis;
  }

  async getAnalysis(id: number): Promise<Analysis | undefined> {
    return this.analyses.get(id);
  }

  async updateAnalysis(id: number, data: Partial<Analysis>): Promise<Analysis> {
    const existing = this.analyses.get(id);
    if (!existing) throw new Error("Analysis not found");
    const updated = { ...existing, ...data };
    this.analyses.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
