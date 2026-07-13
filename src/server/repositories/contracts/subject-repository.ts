/** Entidade de domínio de matéria (`Subject`, docs/DATA-MODEL.md). Leitura apenas nesta fase. */
export interface SubjectEntity {
  id: string;
  name: string;
}

/** Abstração de persistência para matérias (ADR-0002). Métodos mínimos de leitura. */
export interface SubjectRepository {
  findById(id: string): Promise<SubjectEntity | null>;
  list(): Promise<SubjectEntity[]>;
}
