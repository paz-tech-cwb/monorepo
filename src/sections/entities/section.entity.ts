import { Announcement } from "src/announcements/entities/announcement.entity";
import { Contribution } from "src/contributions/entities/contribution.entity";
import { Event } from "src/events/entities/event.entity";
import { Column, CreateDateColumn, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('sections')
export class Section {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	type: string;

	@Column()
	order: number;

	@OneToMany(() => Announcement, a => a.section)
	announcements: Announcement[];

	@OneToOne(() => Contribution, c => c.section)
	contribution: Contribution;

	@OneToMany(() => Event, e => e.section)
	events: Event;

	@CreateDateColumn()
	created_date: Date;

	@UpdateDateColumn()
	updated_date: Date;
}
