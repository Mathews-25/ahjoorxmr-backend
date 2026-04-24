import { Module } from '@nestjs/common';
import { StellarService } from './stellar.service';
import { StellarCircuitBreakerService } from './stellar-circuit-breaker.service';
import { ContractStateGuard } from './contract-state-guard.service';
import { WinstonLogger } from '../common/logger/winston.logger';

@Module({
  providers: [
    StellarService,
    StellarCircuitBreakerService,
    ContractStateGuard,
    WinstonLogger,
  ],
  exports: [StellarService, StellarCircuitBreakerService, ContractStateGuard],
})
export class StellarModule {}
