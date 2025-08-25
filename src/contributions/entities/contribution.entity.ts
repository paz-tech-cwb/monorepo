import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('contributions')
export class Contribution {
	@PrimaryGeneratedColumn()
	id: number;

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
