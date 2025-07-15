import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Address } from 'entities/address.entity';
import { LifeGroup } from 'entities/lifeGroup.entity';

@Entity()
export class Leader {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;

    @ManyToOne(() => Address, (address: Address) => address)
    @JoinColumn({ name: 'addressId' })
    address!: Address;

}
