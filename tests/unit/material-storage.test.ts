import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  sign: vi.fn(),
  create: vi.fn(),
  role: vi.fn(),
  lesson: vi.fn(),
}));
vi.mock("@/config/env", () => ({ env: { DATA_SOURCE: "prisma" } }));
vi.mock("@/server/authorization", () => ({
  requireRole: mocks.role,
  requireUser: vi.fn(async () => ({ userId: "student" })),
}));
vi.mock("@/server/storage/supabase", () => ({
  uploadPdf: mocks.upload,
  removePdf: mocks.remove,
  signedPdfUrl: mocks.sign,
}));
vi.mock("@/server/audit/log", () => ({ auditLog: vi.fn() }));
vi.mock("@/server/repositories/transaction", () => ({
  inRepositoryTransaction: async (fn: () => Promise<unknown>) => fn(),
}));
vi.mock("@/server/repositories/prisma/material-repository", () => ({
  createMaterialRecord: mocks.create,
  getMaterialRecord: vi.fn(async () => ({
    lessonId: "lesson",
    url: "storage:lessons/lesson/example.pdf",
  })),
}));
vi.mock("@/server/repositories", () => ({
  getRepositories: () => ({
    lessons: { findById: mocks.lesson },
    modules: { findById: async () => ({ courseId: "course", slug: "module" }) },
    courses: { findById: async () => ({ slug: "course" }) },
  }),
}));
vi.mock("@/server/services/study-tracking/lesson-view", () => ({ getLessonView: mocks.access }));
import {
  addLessonMaterial,
  resolveMaterialDownload,
  validatePdf,
} from "@/server/services/materials";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.role.mockResolvedValue({ userId: "admin" });
  mocks.lesson.mockResolvedValue({ moduleId: "module" });
  mocks.create.mockResolvedValue({ id: "material" });
  mocks.upload.mockResolvedValue(undefined);
  mocks.remove.mockResolvedValue(undefined);
  mocks.access.mockResolvedValue({});
});
afterEach(() => vi.restoreAllMocks());
describe("private lesson materials", () => {
  it("rejects disguised PDF before contacting storage", async () => {
    const file = new File(["<script>"], "x.pdf", { type: "application/pdf" });
    expect(() => validatePdf(file, new TextEncoder().encode("<script>"))).toThrow();
    await expect(addLessonMaterial("lesson", "Title", file)).rejects.toThrow();
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("requires administrator before reading or uploading the file", async () => {
    mocks.role.mockRejectedValue(new Error("forbidden"));
    await expect(
      addLessonMaterial(
        "lesson",
        "Title",
        new File(["%PDF-1.7"], "x.pdf", { type: "application/pdf" }),
      ),
    ).rejects.toThrow("forbidden");
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("compensates uploaded object if database persistence fails", async () => {
    mocks.create.mockRejectedValue(new Error("database unavailable"));
    const file = {
      size: 8,
      type: "application/pdf",
      arrayBuffer: async () => new TextEncoder().encode("%PDF-1.7").buffer,
    } as File;
    await expect(addLessonMaterial("lesson", "Title", file)).rejects.toThrow(
      "database unavailable",
    );
    expect(mocks.remove).toHaveBeenCalledWith(mocks.upload.mock.calls[0]![0]);
  });
  it("does not sign a download when lesson access is denied", async () => {
    mocks.access.mockRejectedValue(new Error("forbidden"));
    await expect(resolveMaterialDownload("material")).rejects.toThrow("forbidden");
    expect(mocks.sign).not.toHaveBeenCalled();
  });
});
