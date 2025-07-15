import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Leader } from './leader.entity';

@Entity()
export class Assistant {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => Leader, (leader: Leader) => leader)
    @JoinColumn({ name: 'leaderId' })
    leader!: Leader;

    @ManyToOne(() => Address, (address: Address) => address)
    @JoinColumn({ name: 'addressId' })
    address!: Address;
}