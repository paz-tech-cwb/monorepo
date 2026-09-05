import { getMetadataArgsStorage } from 'typeorm';
import { User } from './user.entity';

describe('User entity', () => {
  it('maps role relation to the existing role_id column', () => {
    const joinColumn = getMetadataArgsStorage().joinColumns.find(
      (column) => column.target === User && column.propertyName === 'role',
    );

    expect(joinColumn?.name).toBe('role_id');
  });
});
