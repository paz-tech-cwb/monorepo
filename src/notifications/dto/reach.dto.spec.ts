import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ReachDto } from './reach.dto';

describe('ReachDto', () => {
  it('accepts forms as a valid category', () => {
    const dto = plainToInstance(ReachDto, {
      channels: ['push'],
      segment: { type: 'filtered', filters: { roles: ['area_leader'] } },
      category: 'forms',
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
  });
});
