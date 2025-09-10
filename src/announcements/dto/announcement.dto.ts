import { Announcement } from "../entities/announcement.entity";

export class AnnouncementDto {
	imageUrl: string;
	title: string;
	subtitle: string;
	markdownContent: string;
	actionUrl: string;

	static fromEntity(announcement: Announcement) {
		return {
			id: announcement.id,
			
		}
	}
}