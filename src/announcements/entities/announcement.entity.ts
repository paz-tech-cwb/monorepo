import { Section } from "src/sections/entities/section.entity";
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('announcements')
export class Announcement {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne(() => Section, s => s.announcements)
	section: Section;

	@Column()
	image_url: string;

	@Column()
	title: string;

	@Column()
	subtitle: string;

	@Column({ nullable: true })
	action_url: string;

	@CreateDateColumn()
	created_date: Date;

	@UpdateDateColumn()
	updated_date: Date;
}