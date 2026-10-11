import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

/** Marks a route (or controller) as reachable without a session; admin routes stay behind @Roles. */
export const Public = () => AllowAnonymous();
