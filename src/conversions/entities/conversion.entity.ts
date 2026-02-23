import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ConversionType {
  FIRST_TIME = 'primeira_vez',
  RECONCILIATION = 'reconciliacao',
}

export enum Sex {
  FEMALE = 'feminino',
  MALE = 'masculino',
}

export enum CivilStatus {
  SINGLE = 'solteiro',
  MARRIED = 'casado',
  DIVORCED = 'divorciado',
  WIDOWED = 'viuvo',
}

export enum LifeGroupExperience {
  YES = 'sim',
  NO = 'nao',
  ALREADY_INVITED = 'ja_foi_convidado',
}

@Entity('conversions')
export class Conversion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'full_name', type: 'varchar', length: 255 })
  fullName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  cellphone: string | null;

  @Column({
    type: 'enum',
    enum: ConversionType,
  })
  type: ConversionType;

  @Column({ name: 'how_met_church', type: 'text', nullable: true })
  howMetChurch: string | null;

  @Column({
    type: 'enum',
    enum: Sex,
    nullable: true,
  })
  sex: Sex | null;

  @Column({ type: 'int', nullable: true })
  age: number | null;

  @Column({
    name: 'civil_status',
    type: 'enum',
    enum: CivilStatus,
    nullable: true,
  })
  civilStatus: CivilStatus | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address: string | null;

  @Column({
    name: 'church_attendance_history',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  churchAttendanceHistory: string | null;

  @Column({
    name: 'life_group_experience',
    type: 'enum',
    enum: LifeGroupExperience,
    nullable: true,
  })
  lifeGroupExperience: LifeGroupExperience | null;

  @Column({
    name: 'life_group_leader_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  lifeGroupLeaderName: string | null;

  @Column({ name: 'who_invited', type: 'varchar', length: 255, nullable: true })
  whoInvited: string | null;

  @Column({ type: 'text', nullable: true })
  observations: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
