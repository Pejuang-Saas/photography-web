import { HttpException } from '@nestjs/common';

/** An error the web app can tell apart by `errorCode`, next to the readable message. */
export function galleryError(status: number, errorCode: string, message: string) {
  return new HttpException({ statusCode: status, message, errorCode }, status);
}

export const pagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});

/** A page number and size from a query string, kept within sane bounds. */
export function pageParams(page?: string, limit?: string, defaults = { limit: 10, max: 50 }) {
  const safePage = Math.max(Math.trunc(Number(page)) || 1, 1);
  const safeLimit = Math.min(
    Math.max(Math.trunc(Number(limit)) || defaults.limit, 1),
    defaults.max,
  );
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}
