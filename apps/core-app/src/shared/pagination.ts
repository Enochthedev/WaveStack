import { z } from "zod";

export const PaginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PaginationQuery = z.infer<typeof PaginationQuery>;

export function paginate<T>(data: T[], total: number, limit: number, offset: number) {
  return {
    data,
    meta: {
      total,
      limit,
      offset,
      hasMore: offset + data.length < total,
    },
  };
}
