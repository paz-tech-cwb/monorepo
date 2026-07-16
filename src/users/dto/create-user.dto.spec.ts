import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { CreateAddressDto } from '../../addresses/dto/create-address.dto';

const validPayload = {
  name: 'Maria Silva',
  email: 'maria@example.com',
  phone: '+5541999999999',
  role: 'member',
  address: {
    zip_code: '80000-000',
    country: 'Brasil',
    state: 'PR',
    city: 'Curitiba',
    neighborhood: 'Centro',
    street: 'Rua XV de Novembro',
    number: 'S/N',
    complement: 'Casa 2',
  },
};

function validatePayload(payload: Record<string, unknown>) {
  const dto = plainToInstance(CreateUserDto, payload);
  return {
    dto,
    errors: validateSync(dto),
  };
}

function collectConstrainedProperties(errors: ValidationError[]) {
  const properties: string[] = [];

  const visit = (error: ValidationError) => {
    if (error.constraints) properties.push(error.property);
    error.children?.forEach(visit);
  };

  errors.forEach(visit);
  return properties;
}

describe('CreateUserDto', () => {
  it('accepts a user payload with a structured address', () => {
    const { dto, errors } = validatePayload(validPayload);

    expect(errors).toHaveLength(0);
    expect(dto.address).toBeInstanceOf(CreateAddressDto);
  });

  it('keeps address optional for the separate user creation flow', () => {
    const { dto, errors } = validatePayload({
      name: 'Joao Souza',
      email: 'joao@example.com',
      role: 'member',
    });

    expect(errors).toHaveLength(0);
    expect(dto.address).toBeUndefined();
  });

  it('accepts an unformatted 8 digit zip code', () => {
    const { errors } = validatePayload({
      ...validPayload,
      address: {
        ...validPayload.address,
        zip_code: '80000000',
      },
    });

    expect(errors).toHaveLength(0);
  });

  it('accepts null number and complement', () => {
    const { errors } = validatePayload({
      ...validPayload,
      address: {
        ...validPayload.address,
        number: null,
        complement: null,
      },
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects invalid zip codes and whitespace-only optional address fields when provided', () => {
    const { errors } = validatePayload({
      ...validPayload,
      address: {
        ...validPayload.address,
        zip_code: '8000',
        number: '   ',
        complement: '\t',
      },
    });

    expect(collectConstrainedProperties(errors)).toEqual(
      expect.arrayContaining(['zip_code', 'number', 'complement']),
    );
  });
});
