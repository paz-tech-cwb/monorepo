import { Injectable } from '@nestjs/common';

export interface FormCatalogEntry {
  slug: string;
  name: string;
  description: string;
  can_write: boolean;
  can_read: boolean;
}

const FORM_DEFINITIONS = [
  {
    slug: 'member-registrations',
    name: 'Cadastro do Membro',
    description: 'Registrar um novo membro',
    write: [
      'admin',
      'pastor',
      'area_leader',
      'sector_leader',
      'life_group_leader',
    ],
    read: [
      'admin',
      'pastor',
      'area_leader',
      'sector_leader',
      'life_group_leader',
    ],
  },
  {
    slug: 'form-conversions',
    name: 'Conversão e Reconciliação',
    description: 'Decisão por Cristo',
    write: [
      'admin',
      'pastor',
      'area_leader',
      'sector_leader',
      'life_group_leader',
    ],
    read: [
      'admin',
      'pastor',
      'area_leader',
      'sector_leader',
      'life_group_leader',
    ],
  },
  {
    slug: 'life-group-reports',
    name: 'Relatório de Life Group',
    description: 'Relatório semanal do LG',
    write: [
      'admin',
      'pastor',
      'area_leader',
      'sector_leader',
      'life_group_leader',
    ],
    read: [
      'admin',
      'pastor',
      'area_leader',
      'sector_leader',
      'life_group_leader',
    ],
  },
  {
    slug: 'sector-supervisor-reports',
    name: 'Atividades Supervisor de Setor',
    description: 'Relatório semanal do setor',
    write: ['admin', 'pastor', 'sector_leader'],
    read: ['admin', 'pastor', 'area_leader', 'sector_leader'],
  },
  {
    slug: 'area-supervisor-reports',
    name: 'Atividades Supervisor de Área',
    description: 'Relatório semanal da área',
    write: ['admin', 'pastor', 'area_leader'],
    read: ['admin', 'pastor', 'area_leader'],
  },
  {
    slug: 'multiplications',
    name: 'Multiplicação',
    description: 'Multiplicar um life group',
    write: ['admin', 'pastor', 'area_leader'],
    read: ['admin', 'pastor', 'area_leader'],
  },
  {
    slug: 'service-reports',
    name: 'Relatório do Culto',
    description: 'Relatório do culto/oração',
    write: [
      'admin',
      'pastor',
      'area_leader',
      'sector_leader',
      'life_group_leader',
    ],
    read: [
      'admin',
      'pastor',
      'area_leader',
      'sector_leader',
      'life_group_leader',
    ],
  },
  {
    slug: 'form-guests',
    name: 'Convidado',
    description: 'Registrar um convidado',
    write: [
      'admin',
      'pastor',
      'area_leader',
      'sector_leader',
      'life_group_leader',
    ],
    read: [
      'admin',
      'pastor',
      'area_leader',
      'sector_leader',
      'life_group_leader',
    ],
  },
];

@Injectable()
export class FormsCatalogService {
  listForRole(roleSlug: string): FormCatalogEntry[] {
    return FORM_DEFINITIONS.map((f) => ({
      slug: f.slug,
      name: f.name,
      description: f.description,
      can_write: f.write.includes(roleSlug),
      can_read: f.read.includes(roleSlug),
    })).filter((f) => f.can_read || f.can_write);
  }
}
