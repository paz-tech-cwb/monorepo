import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { Repository } from 'typeorm';

function toResponse(event: Event) {
  return {
    id: event.id,
    title: event.title,
    initial_date: event.initialDate,
    final_date: event.finalDate ?? null,
    description: event.description ?? null,
    recurrence_type: event.recurrenceType ?? null,
    image_url: event.imageUrl ?? null,
    created_at: event.createdAt,
    updated_at: event.updatedAt,
  };
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
    return events.map(toResponse);
  }

  async findPaginated(page: number, limit: number) {
    const events = await this.eventsRepository.find({
      order: { initialDate: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return events.map(toResponse);
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
