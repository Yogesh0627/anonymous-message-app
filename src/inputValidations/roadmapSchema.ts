import { z } from 'zod'

export const roadmapStatusEnum = z.enum(['planned', 'in_progress', 'shipped'])

export const createRoadmapSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120),
  description: z.string().trim().max(1000).default(''),
  status: roadmapStatusEnum.default('planned'),
  targetVersion: z.string().trim().max(20).default(''),
  isPublic: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})

export const updateRoadmapSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  status: roadmapStatusEnum.optional(),
  targetVersion: z.string().trim().max(20).optional(),
  isPublic: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})
