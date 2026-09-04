import { Injectable } from '@nestjs/common';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  create(createAddressDto: CreateAddressDto) {
    void createAddressDto;
    return 'This action adds a new address';
  }

  findAll() {
    return `This action returns all addresses`;
  }

  findOne(id: number) {
    return `This action returns a #${id} address`;
  }

  update(id: number, updateAddressDto: UpdateAddressDto) {
    void updateAddressDto;
    return `This action updates a #${id} address`;
  }

  remove(id: number) {
    return `This action removes a #${id} address`;
  }
}
