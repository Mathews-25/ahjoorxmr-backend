import { SetMetadata } from '@nestjs/common';

export const FEATURE_FLAG_KEY = 'feature_flag';

/**
 * Decorator to protect controller methods with feature flags
 * Returns 404 when the flag is disabled for the requesting user
 *
 * @param flagName - Name of the feature flag to check
 *
 * @example
 * ```typescript
 * @FeatureFlag('websocket_notifications')
 * @Get('notifications/ws')
 * async getWebSocketNotifications() {
 *   // This endpoint is only accessible when the flag is enabled
 * }
 * ```
 */
export const FeatureFlag = (flagName: string) =>
  SetMetadata(FEATURE_FLAG_KEY, flagName);
