import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { IsNull, MoreThanOrEqual, Not, Repository } from 'typeorm';

function toResponse(event: Event, overrideDate?: Date) {
  return {
    id: event.id,
    title: event.title,
    initial_date: overrideDate ?? event.initialDate,
    final_date: event.finalDate ?? null,
    description: event.description ?? null,
    recurrence_type: event.recurrenceType ?? null,
    image_url: event.imageUrl ?? null,
    created_at: event.createdAt,
    updated_at: event.updatedAt,
  };
}

function addByRecurrence(date: Date, recurrenceType: string): Date {
  const next = new Date(date);
  switch (recurrenceType.toUpperCase()) {
    case 'DAILY':
      next.setDate(next.getDate() + 1);
      break;
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
  ) {}

  async create(createEventDto: CreateEventDto) {
    const event = this.eventsRepository.create({
      title: createEventDto.title,
      initialDate: new Date(createEventDto.initial_date),
      finalDate: createEventDto.final_date
        ? new Date(createEventDto.final_date)
        : null,
      description: createEventDto.description ?? null,
      recurrenceType: createEventDto.recurrence_type ?? null,
      imageUrl: createEventDto.image ?? null,
    });
    const saved = await this.eventsRepository.save(event);
    return toResponse(saved);
  }

  async findAll() {
    const events = await this.eventsRepository.find({
      order: { initialDate: 'ASC' },
    });
    return events.map((e) => toResponse(e));
  }

  async findPaginated(page: number, limit: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lookahead = new Date(today);
    lookahead.setFullYear(lookahead.getFullYear() + 2);

    const events = await this.eventsRepository.find({
      where: [
        { recurrenceType: Not(IsNull()) },
        { initialDate: MoreThanOrEqual(today) },
      ],
    });

    const occurrences: ReturnType<typeof toResponse>[] = [];

    for (const event of events) {
      if (!event.recurrenceType) {
        if (event.initialDate >= today) {
          occurrences.push(toResponse(event));
        }
      } else {
        let current = new Date(event.initialDate);
        while (current < today) {
          current = addByRecurrence(current, event.recurrenceType);
        }
        while (current <= lookahead) {
          occurrences.push(toResponse(event, new Date(current)));
          current = addByRecurrence(current, event.recurrenceType);
        }
      }
    }

    occurrences.sort(
      (a, b) =>
        new Date(a.initial_date).getTime() - new Date(b.initial_date).getTime(),
    );

    const skip = (page - 1) * limit;
    return occurrences.slice(skip, skip + limit);
  }

  async findOne(id: number) {
    const event = await this.eventsRepository.findOne({ where: { id } });
    if (!event) throw new NotFoundException(`Event with ID ${id} not found`);
    return toResponse(event);
  }

  async update(id: number, updateEventDto: UpdateEventDto) {
    const event = await this.eventsRepository.findOne({ where: { id } });
    if (!event) throw new NotFoundException(`Event with ID ${id} not found`);

    if (updateEventDto.title !== undefined) event.title = updateEventDto.title;
    if (updateEventDto.initial_date !== undefined)
      event.initialDate = new Date(updateEventDto.initial_date);
    if (updateEventDto.final_date !== undefined)
      event.finalDate = updateEventDto.final_date
        ? new Date(updateEventDto.final_date)
        : null;
    if (updateEventDto.description !== undefined)
      event.description = updateEventDto.description ?? null;
    if (updateEventDto.recurrence_type !== undefined)
      event.recurrenceType = updateEventDto.recurrence_type ?? null;
    if (updateEventDto.image !== undefined)
      event.imageUrl = updateEventDto.image ?? null;

    const saved = await this.eventsRepository.save(event);
    return toResponse(saved);
  }

  async remove(id: number): Promise<void> {
    const result = await this.eventsRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }
  }
}
