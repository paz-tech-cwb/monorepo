import { Event } from "src/events/entities/event.entity";
import { MigrationInterface, QueryRunner } from "typeorm";

export class InsertEventsData1757201131931 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
		const [{ count }] = await queryRunner.query(`SELECT COUNT(*)::int as count FROM "events"`);
		if (count > 0) return;
		await queryRunner.manager.insert(Event, [
			{
				title: "Power Night",
				initialDate: new Date("2025-08-11T20:00:00Z"),
				imageUrl: "https://i.ytimg.com/vi/_3lOV9P2P6A/maxresdefault.jpg"
			},
			{
				title: "Culto Celebração",
				initialDate: new Date("2025-08-20T09:00:00Z"),
				imageUrl: "https://i.ytimg.com/vi/_3lOV9P2P6A/maxresdefault.jpg"
			},
			{
				title: "Culto Celebração II",
				initialDate: new Date("2025-08-20T20:00:00Z"),
				imageUrl: "https://i.ytimg.com/vi/_3lOV9P2P6A/maxresdefault.jpg"
			},
			{
				title: "Culto das Mulheres",
				initialDate: new Date("2025-08-30T20:00:00Z"),
				imageUrl: "https://i.ytimg.com/vi/_3lOV9P2P6A/maxresdefault.jpg"
			}
		])
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.manager.delete(Event, [
			{ title: "Power Night" },
			{ title: "Culto Celebração" },
			{ title: "Culto Celebração II" },
			{ title: "Culto das Mulheres" }
		])
    }

}
