import { Announcement } from "src/announcements/entities/announcement.entity";
import { MigrationInterface, QueryRunner } from "typeorm";

export class InsertAnnouncementsData1757199750633 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
		const [{ count }] = await queryRunner.query(`SELECT COUNT(*)::int as count FROM "announcements"`);
		if (count > 0) return;
		await queryRunner.manager.insert(Announcement, [
			{
				imageUrl: "https://flutter.github.io/assets-for-api-docs/assets/material/content_based_color_scheme_1.png",
				title: "Escola bíblica da Fé I",
				subtitle: "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
				markdownContent: "![Flutter Logo](https://flutter.github.io/assets-for-api-docs/assets/material/content_based_color_scheme_3.png) <video src=\"http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4\">\n\n# Welcome to Paz Church Curitiba\n\nWelcome to the **Paz App**! Here you'll find resources, inspiration, and ways to connect with our community.\n\n## Agenda\n\n- Sunday Service: 10:00 AM\n- Life Group Meetings: Wednesdays, 7:30 PM\n- Special Events: See [our calendar](https://pazchurch.com/events)\n\n## My Journey\n\nTrack your spiritual growth and access study materials:\n\n1. **Bible Reading Plan**\n2. **YouTube Ministrations**\n3. **Courses**\n4. **Life Group Studies**\n\n## Contribute\n\nSupport our mission by making a PIX donation:\n\n```\nPIX Key: pazchurch@pix.com.br\n```\n\n## Inspiration\n\n> \"For where two or three gather in my name, there am I with them.\"  \n> — Matthew 18:20\n\n---\n\nThank you for being part of our community!",
				actionUrl: ""
			},
			{
				imageUrl: "https://flutter.github.io/assets-for-api-docs/assets/material/content_based_color_scheme_1.png",
				title: "Escola bíblica da Fé II",
				subtitle: "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
				markdownContent: "![Flutter Logo](https://flutter.github.io/assets-for-api-docs/assets/material/content_based_color_scheme_3.png) <video src=\"http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4\">\n\n# Welcome to Paz Church Curitiba\n\nWelcome to the **Paz App**! Here you'll find resources, inspiration, and ways to connect with our community.\n\n## Agenda\n\n- Sunday Service: 10:00 AM\n- Life Group Meetings: Wednesdays, 7:30 PM\n- Special Events: See [our calendar](https://pazchurch.com/events)\n\n## My Journey\n\nTrack your spiritual growth and access study materials:\n\n1. **Bible Reading Plan**\n2. **YouTube Ministrations**\n3. **Courses**\n4. **Life Group Studies**\n\n## Contribute\n\nSupport our mission by making a PIX donation:\n\n```\nPIX Key: pazchurch@pix.com.br\n```\n\n## Inspiration\n\n> \"For where two or three gather in my name, there am I with them.\"  \n> — Matthew 18:20\n\n---\n\nThank you for being part of our community!",
				actionUrl: ""
			},
			{
				imageUrl: "https://flutter.github.io/assets-for-api-docs/assets/material/content_based_color_scheme_1.png",
				title: "Escola bíblica da Fé III",
				subtitle: "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
				markdownContent: "![Flutter Logo](https://flutter.github.io/assets-for-api-docs/assets/material/content_based_color_scheme_3.png) <video src=\"http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4\">\n\n# Welcome to Paz Church Curitiba\n\nWelcome to the **Paz App**! Here you'll find resources, inspiration, and ways to connect with our community.\n\n## Agenda\n\n- Sunday Service: 10:00 AM\n- Life Group Meetings: Wednesdays, 7:30 PM\n- Special Events: See [our calendar](https://pazchurch.com/events)\n\n## My Journey\n\nTrack your spiritual growth and access study materials:\n\n1. **Bible Reading Plan**\n2. **YouTube Ministrations**\n3. **Courses**\n4. **Life Group Studies**\n\n## Contribute\n\nSupport our mission by making a PIX donation:\n\n```\nPIX Key: pazchurch@pix.com.br\n```\n\n## Inspiration\n\n> \"For where two or three gather in my name, there am I with them.\"  \n> — Matthew 18:20\n\n---\n\nThank you for being part of our community!",
				actionUrl: ""
			}
		])
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.manager.delete(Announcement, [
			{ title: "Escola bíblica da Fé I" },
			{ title: "Escola bíblica da Fé II" },
			{ title: "Escola bíblica da Fé III" }
		])
    }

}