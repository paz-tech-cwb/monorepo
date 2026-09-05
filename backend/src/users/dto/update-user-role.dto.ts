import { Expose } from 'class-transformer';
import { IsIn, IsNotEmpty } from 'class-validator';

export const VALID_ROLE_SLUGS = [
  'admin',
  'pastor',
  'area_leader',
  'sector_leader',
  'life_group_leader',
  'member',
] as const;

export type RoleSlug = (typeof VALID_ROLE_SLUGS)[number];

export class UpdateUserRoleDto {
  @Expose()
  @IsNotEmpty()
  @IsIn(VALID_ROLE_SLUGS)
  role: RoleSlug;
}
