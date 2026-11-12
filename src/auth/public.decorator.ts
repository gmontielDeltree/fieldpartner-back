import { SetMetadata } from '@nestjs/common';

/** Metadata key read by JwtAuthGuard to allow unauthenticated access. */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route (or whole controller) as public, bypassing the global JwtAuthGuard.
 * Everything is authenticated by default — only endpoints explicitly decorated
 * with @Public() are reachable without a valid Cognito access token.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
