import { Injectable } from '@nestjs/common';
import { MinistryAccessService } from '../ministry-access/ministry-access.service';
import { MINISTRY_LINKED_FORMS } from '../ministry-access/ministry-linked-forms';

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
  constructor(private readonly ministryAccess: MinistryAccessService) {}

  async listForRole(actor: {
    id: number;
    roleSlug: string;
  }): Promise<FormCatalogEntry[]> {
    const entries = await Promise.all(
      FORM_DEFINITIONS.map(async (f) => {
        const ministrySlug = MINISTRY_LINKED_FORMS[f.slug];
        let canWrite: boolean;
        let canRead: boolean;

        if (ministrySlug) {
          const isAdminOrPastor =
            actor.roleSlug === 'admin' || actor.roleSlug === 'pastor';
          const { isLeader, isMember } = isAdminOrPastor
            ? { isLeader: true, isMember: true }
            : await this.ministryAccess.resolve(actor.id, ministrySlug);
          canWrite = isAdminOrPastor || isMember || isLeader;
          canRead = isAdminOrPastor || isLeader;
        } else {
          canWrite = f.write.includes(actor.roleSlug);
          canRead = f.read.includes(actor.roleSlug);
        }

        return {
          slug: f.slug,
          name: f.name,
          description: f.description,
          can_write: canWrite,
          can_read: canRead,
        };
      }),
    );

    return entries.filter((f) => f.can_read || f.can_write);
  }
}
