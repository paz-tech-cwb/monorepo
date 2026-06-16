import { Expose } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateServiceReportDto {
  @Expose() @IsString() date: string;
  @Expose({ name: 'report_type' }) @IsString() reportType: string;
  @Expose() @IsString() period: string;
  @Expose({ name: 'atmosphere_team_id' })
  @IsOptional()
  @IsInt()
  atmosphereTeamId?: number;
  @Expose({ name: 'atmosphere_team_other' })
  @IsOptional()
  @IsString()
  atmosphereTeamOther?: string;
  @Expose({ name: 'atmosphere_responsible' })
  @IsString()
  atmosphereResponsible: string;
  @Expose({ name: 'tadel_adults' }) @IsInt() @Min(0) tadelAdults: number;
  @Expose({ name: 'tadel_kids' })
  @IsOptional()
  @IsInt()
  @Min(0)
  tadelKids?: number;
  @Expose({ name: 'vehicles_cars' }) @IsInt() @Min(0) vehiclesCars: number;
  @Expose({ name: 'vehicles_motos' })
  @IsOptional()
  @IsInt()
  @Min(0)
  vehiclesMotos?: number;
  @Expose({ name: 'vehicles_bikes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  vehiclesBikes?: number;
  @Expose({ name: 'vehicles_others' })
  @IsOptional()
  @IsString()
  vehiclesOthers?: string;
  @Expose({ name: 'volunteers_atmosfera' })
  @IsOptional()
  @IsInt()
  @Min(0)
  volunteersAtmosfera?: number;
  @Expose({ name: 'volunteers_louvor' })
  @IsOptional()
  @IsInt()
  @Min(0)
  volunteersLouvor?: number;
  @Expose({ name: 'volunteers_midia' })
  @IsOptional()
  @IsInt()
  @Min(0)
  volunteersMiddia?: number;
  @Expose({ name: 'volunteers_danca' })
  @IsOptional()
  @IsInt()
  @Min(0)
  volunteersDanca?: number;
  @Expose() @IsOptional() @IsString() notes?: string;
}
