import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('announcements')
export class Announcement {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	image_url: string;

	@Column()
	title: string;

	@Column()
	subtitle: string;

	@Column({ nullable: true })
	action_url: string;

	@CreateDateColumn()
	created_at: Date;

	@UpdateDateColumn()
	updated_at: Date;
}