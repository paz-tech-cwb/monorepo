import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('church_settings')
export class ChurchSetting {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
