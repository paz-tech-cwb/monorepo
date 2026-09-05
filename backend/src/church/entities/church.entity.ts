import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface ChurchAddress {
  street: string;
  number: string;
  complement: string | null;
  reference: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
}

export interface ChurchContact {
  phone: string;
  email: string;
  website: string;
}

export interface ChurchScheduleSlot {
  morning?: string;
  evening?: string;
}

export interface ChurchSchedule {
  sunday: ChurchScheduleSlot;
  wednesday: ChurchScheduleSlot;
  friday: ChurchScheduleSlot;
  saturday: ChurchScheduleSlot;
}

export interface ChurchSocialMedia {
  facebook?: string;
  instagram?: string;
  youtube?: string;
  twitter?: string;
}

@Entity('church')
export class Church {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  address: ChurchAddress;

  @Column({ type: 'jsonb', default: '{}' })
  contact: ChurchContact;

  @Column({ type: 'jsonb', default: '{}' })
  schedule: ChurchSchedule;

  @Column({ name: 'social_media', type: 'jsonb', default: '{}' })
  socialMedia: ChurchSocialMedia;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
