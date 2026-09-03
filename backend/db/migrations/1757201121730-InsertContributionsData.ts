import { Contribution } from "src/contributions/entities/contribution.entity";
import { MigrationInterface, QueryRunner } from "typeorm";

export class InsertContributionsData1757201121730 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
		const [{ count }] = await queryRunner.query(`SELECT COUNT(*)::int as count FROM "contributions"`);
		if (count > 0) return;
		await queryRunner.manager.insert(Contribution, [
			{
				bankName: "Banco do Brasil",
				branchNumber: "2920-3",
				accountNumber: "40754-2",
				pixKey: "18.975.120/0001-70"
			}
		])
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.manager.delete(Contribution, [
			{ bankName: "Banco do Brasil" }
		])
    }

}
