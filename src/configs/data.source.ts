import { DataSource } from 'typeorm';
import { Announcement } from '../announcements/entities/announcement.entity';
import { Address } from '../addresses/entities/address.entity';
import { Role } from '../roles/entities/role.entity';
import { Contribution } from '../contributions/entities/contribution.entity';
import { Event } from '../events/entities/event.entity';
import { User } from '../users/entities/user.entity';
import { UserAccount } from '../users/entities/account.entity';
import { Course } from '../courses/entities/course.entity';
import { CourseTrack } from '../academy/entities/course-track.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { Church } from '../church/entities/church.entity';
import { MemberJourneyStage } from '../member-journey/entities/member-journey-stage.entity';
import { Area } from '../areas/entities/area.entity';
import { Sector } from '../sectors/entities/sector.entity';
import { LifeGroup } from '../life-groups/entities/life-group.entity';
import { MeetingReport } from '../meeting-reports/entities/meeting-report.entity';
import { Conversion } from '../conversions/entities/conversion.entity';
import { UserDeviceToken } from '../users/entities/user-device-token.entity';
import { UserNotificationPreferences } from '../users/entities/user-notification-preferences.entity';
import { FormSubmissionAuditLog } from '../forms-core/entities/form-submission-audit-log.entity';
import { ChurchSetting } from '../forms-core/entities/church-setting.entity';
import { FormCourse } from '../form-courses/entities/form-course.entity';
import { FormCourseLink } from '../form-courses/entities/form-course-link.entity';
import { MemberRegistration } from '../member-registrations/entities/member-registration.entity';
import * as dotenv from 'dotenv';
dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME,
  entities: [
    Announcement,
    Address,
    Role,
    Contribution,
    Event,
    User,
    UserAccount,
    Course,
    CourseTrack,
    Notification,
    Church,
    MemberJourneyStage,
    Area,
    Sector,
    LifeGroup,
    MeetingReport,
    Conversion,
    UserDeviceToken,
    UserNotificationPreferences,
    FormSubmissionAuditLog,
    ChurchSetting,
    FormCourse,
    FormCourseLink,
    MemberRegistration,
  ],
  migrations: ['dist/database/migrations/*.js'],
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
});
