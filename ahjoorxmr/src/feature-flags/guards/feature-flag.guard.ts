import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagService } from '../services/feature-flag.service';
import { FEATURE_FLAG_KEY } from '../decorators/feature-flag.decorator';

/**
 * Guard to enforce feature flag checks on controller methods
 * Returns 404 when the flag is disabled for the requesting user
 */
@Injectable()
export class FeatureFlagGuard implements CanActivate {
  private readonly logger = new Logger(FeatureFlagGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const flagName = this.reflector.get<string>(
      FEATURE_FLAG_KEY,
      context.getHandler(),
    );

    if (!flagName) {
      // No feature flag decorator, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const userId = user?.id;
    const userRole = user?.role;

    const evaluation = await this.featureFlagService.evaluate(
      flagName,
      userId,
      userRole,
    );

    if (!evaluation.enabled) {
      this.logger.debug(
        `Feature flag '${flagName}' denied access: ${evaluation.reason}`,
      );

      // Return 404 to hide the existence of the feature
      throw new NotFoundException();
    }

    this.logger.debug(
      `Feature flag '${flagName}' granted access: ${evaluation.reason}`,
    );

    return true;
  }
}
