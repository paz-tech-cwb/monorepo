import { Address } from './address.entity';

describe('Address entity', () => {
  it('accepts a nullable zipCode', () => {
    const address = new Address();
    address.zipCode = '01310100';
    expect(address.zipCode).toBe('01310100');
  });
});
