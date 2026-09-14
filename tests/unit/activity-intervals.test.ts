import { describe, it, expect } from "vitest";
import {
  sumValidSecondsByDate,
  toActivityDates,
  validSecondsWithinWindow,
} from "@/server/services/study-tracking/activity-days";
describe("accepted activity intervals", () => {
  it("splits a midnight heartbeat instead of moving the full session to the next day", () => {
    const rows = [
      {
        validSeconds: 10,
        activityStartedAt: "2026-09-13T23:59:55Z",
        lastHeartbeatAt: "2026-09-14T00:00:05Z",
      },
    ];
    expect([...sumValidSecondsByDate(rows, "UTC")]).toEqual([
      ["2026-09-13T00:00:00.000Z", 5],
      ["2026-09-14T00:00:00.000Z", 5],
    ]);
    expect(toActivityDates(rows, "UTC")).toHaveLength(2);
  });
  it("uses civil midnight in the selected timezone and handles a DST clock repetition", () => {
    expect([
      ...sumValidSecondsByDate(
        [
          {
            validSeconds: 10,
            activityStartedAt: "2026-09-14T02:59:55Z",
            lastHeartbeatAt: "2026-09-14T03:00:05Z",
          },
        ],
        "America/Sao_Paulo",
      ),
    ]).toEqual([
      ["2026-09-13T00:00:00.000Z", 5],
      ["2026-09-14T00:00:00.000Z", 5],
    ]);
    expect([
      ...sumValidSecondsByDate(
        [
          {
            validSeconds: 10,
            activityStartedAt: "2026-11-01T08:59:55Z",
            lastHeartbeatAt: "2026-11-01T09:00:05Z",
          },
        ],
        "America/Los_Angeles",
      ),
    ]).toEqual([["2026-11-01T00:00:00.000Z", 10]]);
  });
  it("clips ranking time to the selected window and retains explicit mock snapshot behavior", () => {
    const row = {
      validSeconds: 10,
      activityStartedAt: "2026-09-13T23:59:55Z",
      lastHeartbeatAt: "2026-09-14T00:00:05Z",
    };
    expect(
      validSecondsWithinWindow(
        row,
        new Date("2026-09-14T00:00:00Z"),
        new Date("2026-09-15T00:00:00Z"),
      ),
    ).toBe(5);
    expect([
      ...sumValidSecondsByDate([{ validSeconds: 60, lastHeartbeatAt: row.lastHeartbeatAt }], "UTC"),
    ]).toEqual([["2026-09-14T00:00:00.000Z", 60]]);
  });
});
