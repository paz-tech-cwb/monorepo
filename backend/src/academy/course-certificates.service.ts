import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { CourseCertificate } from './entities/course-certificate.entity';
import { Course } from '../courses/entities/course.entity';

@Injectable()
export class CourseCertificatesService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  private async toResponse(certificate: CourseCertificate) {
    const course = await this.entityManager.findOne(Course, {
      where: { id: certificate.courseId },
    });
    return {
      id: certificate.id,
      course_id: certificate.courseId,
      course_title: course?.title ?? null,
      certificate_code: certificate.certificateCode,
      issued_at: certificate.issuedAt,
      score_percentage: certificate.scorePercentage,
    };
  }

  async listForUser(userId: number) {
    const certificates = await this.entityManager.find(CourseCertificate, {
      where: { userId },
      order: { issuedAt: 'DESC' },
    });
    return Promise.all(certificates.map((c) => this.toResponse(c)));
  }

  async findOneForUser(userId: number, id: string) {
    const certificate = await this.entityManager.findOne(CourseCertificate, {
      where: { id },
    });

    // Return 404 (not 403) when the certificate belongs to someone else, so a
    // scanning client can't distinguish "doesn't exist" from "exists but
    // isn't yours" — avoids ID enumeration leaking existence.
    if (!certificate || certificate.userId !== userId) {
      throw new NotFoundException(`Certificate with ID ${id} not found`);
    }

    return this.toResponse(certificate);
  }
}
