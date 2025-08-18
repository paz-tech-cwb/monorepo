import { Section } from "src/sections/entities/section.entity";
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('events')
export class Event {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne(() => Section, s => s.events)
	section: Section;

	@Column()
	title: string;

	@Column({ type: 'timestamp' })
	date: Date;

	@Column()
	image_url: string;

	@CreateDateColumn()
	created_date: Date;

	@UpdateDateColumn()
	updated_date: Date;
}