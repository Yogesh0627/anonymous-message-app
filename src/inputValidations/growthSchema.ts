import { z } from 'zod'

export const acceptPlanSchema = z.object({
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(1000).default(''),
  tasks: z.array(z.string().trim().min(1).max(400)).min(1).max(6),
  sourceMessageIds: z.array(z.string()).max(50).optional(),
})

export const checkInSchema = z.object({
  planId: z.string().min(1),
  note: z.string().trim().min(5, 'Add a sentence about how it went').max(500),
  mood: z.number().int().min(1).max(5),
})

export const toggleTaskSchema = z.object({
  planId: z.string().min(1),
  taskId: z.string().min(1),
  done: z.boolean(),
})
