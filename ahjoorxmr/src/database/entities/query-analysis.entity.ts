import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Entity for storing database query performance analysis results
 */
@Entity('query_analysis')
export class QueryAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64 })
  @Index()
  query_hash: string;

  @Column({ type: 'text' })
  query_text: string;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  @Index()
  mean_exec_time: number;

  @Column({ type: 'bigint' })
  calls: number;

  @Column({ type: 'decimal', precision: 15, scale: 3 })
  total_exec_time: number;

  @Column({ type: 'jsonb' })
  explain_plan: any;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @Index()
  captured_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
