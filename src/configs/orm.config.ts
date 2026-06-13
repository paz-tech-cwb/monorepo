import { DataSourceOptions } from 'typeorm';
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
import { FormConversion } from '../form-conversions/entities/form-conversion.entity';
import { LifeGroupReport } from '../life-group-reports/entities/life-group-report.entity';
import { SectorSupervisorReport } from '../sector-supervisor-reports/entities/sector-supervisor-report.entity';
import { AreaSupervisorReport } from '../area-supervisor-reports/entities/area-supervisor-report.entity';
import { Multiplication } from '../multiplications/entities/multiplication.entity';
import { ServiceReport } from '../service-reports/entities/service-report.entity';
import { FormGuest } from '../form-guests/entities/form-guest.entity';
import { Ministry } from '../ministries/entities/ministry.entity';
import { MinistryTeam } from '../ministries/entities/ministry-team.entity';
import { ReminderRule } from '../reminders/entities/reminder-rule.entity';
import { ReminderDispatchLog } from '../reminders/entities/reminder-dispatch-log.entity';
import * as dotenv from 'dotenv';
dotenv.config();

const config: DataSourceOptions = {
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
    FormConversion,
    LifeGroupReport,
    SectorSupervisorReport,
    AreaSupervisorReport,
    Multiplication,
    ServiceReport,
    FormGuest,
    Ministry,
    MinistryTeam,
    ReminderRule,
    ReminderDispatchLog,
  ],
  migrations: ['dist/migrations/*.js'],
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
};

export default config;
