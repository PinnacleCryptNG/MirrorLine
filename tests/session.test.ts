import { describe, expect, it } from "vitest";
import { deriveSessionSnapshot } from "@/lib/bitget/session";
import type { MarketCalendar, MarketStates } from "@/lib/bitget/types";

const states: MarketStates = {
  market: "US",
  daylightType: "standard",
  windows: [
    { state: "pre_market", timeZone: "EST", startTime: "04:00", endTime: "09:30" },
    { state: "regular", timeZone: "EST", startTime: "09:30", endTime: "16:00" },
    { state: "after_hours", timeZone: "EST", startTime: "16:00", endTime: "20:00" },
    { state: "overnight", timeZone: "EST", startTime: "20:00", endTime: "04:00" },
  ],
};

const calendar: MarketCalendar = {
  timeZone: "EST",
  weekendDays: ["SATURDAY", "SUNDAY"],
  holidays: [
    { remark: "", startTime: "2026-09-06 20:00", endTime: "2026-09-07 20:00" },
  ],
};

describe("deriveSessionSnapshot", () => {
  it("maps a Thursday New York lunch hour to US_REGULAR", () => {
    const session = deriveSessionSnapshot({
      now: new Date("2026-09-17T15:00:00.000Z"),
      states,
      calendar,
    });
    expect(session.bitgetState).toBe("regular");
    expect(session.marketSession).toBe("US_REGULAR");
    expect(session.underlyingUsEquity).toBe("regular");
    expect(session.weekend).toBe(false);
  });

  it("maps Friday evening to overnight / US_CLOSED", () => {
    const session = deriveSessionSnapshot({
      now: new Date("2026-09-19T01:00:00.000Z"),
      states,
      calendar,
    });
    expect(session.bitgetState).toBe("overnight");
    expect(session.marketSession).toBe("US_CLOSED");
    expect(session.underlyingUsEquity).toBe("closed");
  });

  it("maps Saturday afternoon to WEEKEND", () => {
    const session = deriveSessionSnapshot({
      now: new Date("2026-09-19T16:00:00.000Z"),
      states,
      calendar,
    });
    expect(session.marketSession).toBe("WEEKEND");
    expect(session.underlyingUsEquity).toBe("closed");
    expect(session.weekend).toBe(true);
  });

  it("maps Bitget holiday windows to HOLIDAY without inventing a remark", () => {
    const session = deriveSessionSnapshot({
      now: new Date("2026-09-07T16:00:00.000Z"),
      states,
      calendar,
    });
    expect(session.marketSession).toBe("HOLIDAY");
    expect(session.holiday?.startTime).toBe("2026-09-06 20:00");
    expect(session.holiday?.remark).toBe("");
  });
});
