import { mockTopics } from "@/mocks";
import type { TopicEntity, TopicRepository } from "../contracts/topic-repository";

/** Implementação mock — lê de `src/mocks/data/topics.ts` (ADR-0011). */
export class MockTopicRepository implements TopicRepository {
  async findById(id: string): Promise<TopicEntity | null> {
    return mockTopics.find((topic) => topic.id === id) ?? null;
  }

  async listBySubjectId(subjectId: string): Promise<TopicEntity[]> {
    return mockTopics.filter((topic) => topic.subjectId === subjectId);
  }

  async list(): Promise<TopicEntity[]> {
    return [...mockTopics];
  }
}
