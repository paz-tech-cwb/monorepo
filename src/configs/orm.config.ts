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
  ],
  migrations: ['dist/migrations/*.js'],
  synchronize: process.env.DB_SYNCHRONIZE === 'false',
  logging: process.env.DB_LOGGING === 'true',
};

export default config;
