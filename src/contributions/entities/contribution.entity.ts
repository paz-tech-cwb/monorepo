import { Section } from "src/sections/entities/section.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('contributions')
export class Contribution {
	@PrimaryGeneratedColumn()
	id: number;

	@OneToOne(() => Section, s => s.contribution)
	@JoinColumn()
	section: Section;

	@Column()
	bank_name: string;

	@Column()
	branch_name: string;

	@Column()
	account_number: string;

	@Column()
	pix_key: string;

	@CreateDateColumn()
	created_date: Date;

	@UpdateDateColumn()
	updated_date: Date;
}
