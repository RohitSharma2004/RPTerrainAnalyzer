import {
  users,
  analyses,
  safeZones,
  type User,
  type InsertUser,
  type Analysis,
  type InsertAnalysis,
  type SafeZone,
  type InsertSafeZone
} from "../shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

// Storage interface for the application
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Analysis methods
  getAnalysis(id: number): Promise<Analysis | undefined>;
  getAnalysesByUser(userId: number): Promise<Analysis[]>;
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  updateAnalysis(id: number, updates: Partial<Analysis>): Promise<Analysis | undefined>;
  deleteAnalysis(id: number): Promise<boolean>;
  
  // Safe Zone methods
  getSafeZones(analysisId: number): Promise<SafeZone[]>;
  createSafeZone(safeZone: InsertSafeZone): Promise<SafeZone>;
  deleteSafeZones(analysisId: number): Promise<boolean>;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // Analysis methods
  async getAnalysis(id: number): Promise<Analysis | undefined> {
    const [analysis] = await db.select().from(analyses).where(eq(analyses.id, id));
    return analysis;
  }

  async getAnalysesByUser(userId: number): Promise<Analysis[]> {
    return db
      .select()
      .from(analyses)
      .where(eq(analyses.userId, userId))
      .orderBy(desc(analyses.createdAt));
  }

  async createAnalysis(analysis: InsertAnalysis): Promise<Analysis> {
    const [newAnalysis] = await db.insert(analyses).values(analysis).returning();
    return newAnalysis;
  }

  async updateAnalysis(id: number, updates: Partial<Analysis>): Promise<Analysis | undefined> {
    const [updatedAnalysis] = await db
      .update(analyses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(analyses.id, id))
      .returning();
    return updatedAnalysis;
  }

  async deleteAnalysis(id: number): Promise<boolean> {
    // First delete associated safe zones
    await this.deleteSafeZones(id);
    
    // Then delete the analysis
    const result = await db.delete(analyses).where(eq(analyses.id, id));
    return true;
  }

  // Safe Zone methods
  async getSafeZones(analysisId: number): Promise<SafeZone[]> {
    return db
      .select()
      .from(safeZones)
      .where(eq(safeZones.analysisId, analysisId));
  }

  async createSafeZone(safeZone: InsertSafeZone): Promise<SafeZone> {
    const [newSafeZone] = await db.insert(safeZones).values(safeZone).returning();
    return newSafeZone;
  }

  async deleteSafeZones(analysisId: number): Promise<boolean> {
    await db.delete(safeZones).where(eq(safeZones.analysisId, analysisId));
    return true;
  }
}

// Create and export a singleton instance
export const storage = new DatabaseStorage();