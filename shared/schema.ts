// Database schema for RPTerrain Analyzer

import { relations, InferModel } from 'drizzle-orm';
import { pgTable, serial, text, timestamp, boolean, integer, jsonb, real } from 'drizzle-orm/pg-core';

// Users table to store user accounts
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  analyses: many(analyses),
}));

// Analyses table to store terrain analysis results
export const analyses = pgTable('analyses', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  analysisType: text('analysis_type').notNull(), // 'image', 'video', 'gps'
  isSafeTerrain: boolean('is_safe_terrain').notNull(),
  confidenceScore: real('confidence_score'),
  processingMethod: text('processing_method').notNull(), // 'ml', 'cv'
  processingTime: integer('processing_time').notNull(), // in milliseconds
  details: jsonb('details').notNull(), // Additional analysis details as JSON
  metadata: jsonb('metadata'), // Image/video metadata
  locationData: jsonb('location_data'), // GPS coordinates and related data
  thumbnailUrl: text('thumbnail_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Analysis relations
export const analysesRelations = relations(analyses, ({ one }) => ({
  user: one(users, {
    fields: [analyses.userId],
    references: [users.id],
  }),
}));

// Safe landing zones detected in analyses
export const safeZones = pgTable('safe_zones', {
  id: serial('id').primaryKey(),
  analysisId: integer('analysis_id').references(() => analyses.id).notNull(),
  x: real('x').notNull(), // x coordinate (percentage or pixels)
  y: real('y').notNull(), // y coordinate (percentage or pixels)
  width: real('width').notNull(), // width (percentage or pixels)
  height: real('height').notNull(), // height (percentage or pixels)
  confidence: real('confidence'), // confidence level for this safe zone
  details: jsonb('details'), // Additional zone details as JSON
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Safe zone relations
export const safeZonesRelations = relations(safeZones, ({ one }) => ({
  analysis: one(analyses, {
    fields: [safeZones.analysisId],
    references: [analyses.id],
  }),
}));

// Type definitions
export type User = InferModel<typeof users>;
export type InsertUser = InferModel<typeof users, 'insert'>;

export type Analysis = InferModel<typeof analyses>;
export type InsertAnalysis = InferModel<typeof analyses, 'insert'>;

export type SafeZone = InferModel<typeof safeZones>;
export type InsertSafeZone = InferModel<typeof safeZones, 'insert'>;