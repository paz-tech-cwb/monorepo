import { getMetadataArgsStorage } from 'typeorm';
import { Address } from './address.entity';

describe('Address entity', () => {
  it('accepts a nullable zipCode', () => {
    const address = new Address();
    address.zipCode = '01310100';
    expect(address.zipCode).toBe('01310100');

    address.zipCode = null;
    expect(address.zipCode).toBeNull();
  });

  // NOTE: this is a metadata assertion, not a database round-trip. It guards the
  // column contract that `UsersService.normalizeZipCode` exists to satisfy, but it
  // can NOT catch a real Postgres value-too-long error — only an integration test
  // against a live database can. See the migration
  // (1795300000000-AddZipCodeToAddress) for the data-normalizing type change.
  it('declares zip_code as a nullable varchar(8) column', () => {
    const column = getMetadataArgsStorage().columns.find(
      (c) => c.target === Address && c.propertyName === 'zipCode',
    );

    expect(column?.options.name).toBe('zip_code');
    expect(column?.options.length).toBe(8);
    expect(column?.options.nullable).toBe(true);
  });
});
