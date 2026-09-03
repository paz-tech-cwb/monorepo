import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertRoles1695223456789 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO roles (name) VALUES
            ('admin'),
            ('pastor'),
            ('area_leader'),
            ('sector_leader'),
            ('life_group_leader'),
            ('member');
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM roles WHERE name IN (
                'admin',
                'pastor',
                'area_leader',
                'sector_leader',
                'life_group_leader',
                'member'
            );
        `);
    }
}