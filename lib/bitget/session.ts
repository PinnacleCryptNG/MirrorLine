import { isoFromMillis, nowIso } from "@/lib/utils";
import { companyOverviewSchema, marketCalendarSchema, marketStatesSchema } from "./schemas";
import { parseSessionState } from "./schemas";
import { normalizeRTokenSymbol, underlyingFromPair } from "./symbols";
import type { BitgetClient } from "./client";
import { getBitgetClient } from "./client";
import { cached } from "./cache";
import { listRealityStockInfo } from "./assets";
import type {
  BitgetSessionState,
  CompanyOverview,
  DataProvenance,
  MarketCalendar,
  MarketSession,
  MarketStates,
  RealityStockInfo,
  SessionSnapshot,
} from "./types";

const STATES_PATH = "/api/v3/reality/market/states";
const CALENDAR_PATH = "/api/v3/reality/market/calendar";
const COMPANY_PATH = "/api/v3/reality/market/company-overview";
const NY_TIME_ZONE = "America/New_York";

type WeekdayName =
  | "SUNDAY"
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY";

export async function getMarketStates(
  client: BitgetClient = getBitgetClient(),
): Promise<{ states: MarketStates; provenance: DataProvenance }> {
  return cached("market-states", 5 * 60 * 1000, async () => {
    const retrievedAt = nowIso();
    const envelope = await client.get<unknown>(STATES_PATH);
    const parsed = marketStatesSchema.parse(envelope.data);
    const windows = parsed.stateList
      .map((window) => {
        const state = parseSessionState(window.state);
        if (!state) {
          return null;
        }
        return {
          state,
          timeZone: window.timeZone,
          startTime: window.startTime,
          endTime: window.endTime,
        };
      })
      .filter((window): window is NonNullable<typeof window> => window !== null);

    return {
      states: {
        market: parsed.market,
        daylightType: parsed.daylightType,
        windows,
      },
      provenance: {
        source: "bitget",
        endpoint: STATES_PATH,
        retrievedAt,
        requestTime: envelope.requestTime,
        observedAt: isoFromMillis(envelope.requestTime),
      },
    };
  });
}

export async function getMarketCalendar(
  client: BitgetClient = getBitgetClient(),
): Promise<{ calendar: MarketCalendar; provenance: DataProvenance }> {
  return cached("market-calendar", 60 * 60 * 1000, async () => {
    const retrievedAt = nowIso();
    const envelope = await client.get<unknown>(CALENDAR_PATH);
    const parsed = marketCalendarSchema.parse(envelope.data);
    return {
      calendar: {
        timeZone: parsed.timeZone,
        weekendDays: parsed.regularConfig,
        holidays: parsed.specificConfig.map((item) => ({
          remark: item.remark ?? "",
          startTime: item.startTime,
          endTime: item.endTime,
        })),
      },
      provenance: {
        source: "bitget",
        endpoint: CALENDAR_PATH,
        retrievedAt,
        requestTime: envelope.requestTime,
        observedAt: isoFromMillis(envelope.requestTime),
      },
    };
  });
}

export async function getCompanyOverview(
  code: string,
  client: BitgetClient = getBitgetClient(),
): Promise<{ company: CompanyOverview; provenance: DataProvenance }> {
  return cached(`company-overview:${code.toUpperCase()}`, 60 * 60 * 1000, async () => {
    const retrievedAt = nowIso();
    const envelope = await client.get<unknown>(COMPANY_PATH, {
      searchParams: { code },
    });
    const parsed = companyOverviewSchema.parse(envelope.data);
    return {
      company: {
        code: parsed.code,
        name: parsed.name,
        peRatio: parsed.peRatio,
        pbRatio: parsed.pbRatio,
        totalShares: parsed.totalShares,
        marketCap: parsed.marketCap,
        high52Week: parsed.high52Week,
        low52Week: parsed.low52Week,
        listingDate: parsed.listingDate ?? parsed.ListingDate,
        employees: parsed.employees,
        companyAddress: parsed.companyAddress,
      },
      provenance: {
        source: "bitget",
        endpoint: COMPANY_PATH,
        retrievedAt,
        requestTime: envelope.requestTime,
        observedAt: isoFromMillis(envelope.requestTime),
      },
    };
  });
}

export async function getStockInfoForSymbol(
  symbol: string,
  client: BitgetClient = getBitgetClient(),
): Promise<{ stock: RealityStockInfo | null; provenance: DataProvenance }> {
  const pair = normalizeRTokenSymbol(symbol);
  const result = await listRealityStockInfo(client, pair);
  const stock = result.items.find((item) => item.symbol.toUpperCase() === pair) ?? null;
  return { stock, provenance: result.provenance };
}

function nyParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: NY_TIME_ZONE,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  const weekdayMap: Record<string, WeekdayName> = {
    Sun: "SUNDAY",
    Mon: "MONDAY",
    Tue: "TUESDAY",
    Wed: "WEDNESDAY",
    Thu: "THURSDAY",
    Fri: "FRIDAY",
    Sat: "SATURDAY",
  };
  return {
    weekday: weekdayMap[parts.weekday] ?? "SUNDAY",
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

function minutesOfDay(hour: number, minute: number): number {
  return hour * 60 + minute;
}

function parseHm(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return minutesOfDay(h, m);
}

function inHmWindow(nowMinutes: number, start: string, end: string): boolean {
  const startMinutes = parseHm(start);
  const endMinutes = parseHm(end);
  if (startMinutes === endMinutes) {
    return true;
  }
  if (startMinutes < endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

function parseCalendarLocal(value: string): Date | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute, second] = match;
  // Interpret Bitget calendar timestamps in America/New_York. Bitget labels
  // this EST even when the US is on daylight time; we do not rewrite that label.
  const asUtcGuess = Date.parse(
    `${year}-${month}-${day}T${hour}:${minute}:${second ?? "00"}-05:00`,
  );
  if (!Number.isFinite(asUtcGuess)) {
    return null;
  }
  const guess = new Date(asUtcGuess);
  const parts = nyParts(guess);
  const desired = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second ?? "00"),
  );
  const actual = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0);
  const adjusted = new Date(guess.getTime() + (desired - actual));
  return adjusted;
}

export function deriveSessionSnapshot(options: {
  now?: Date;
  states: MarketStates;
  calendar: MarketCalendar;
}): SessionSnapshot {
  const now = options.now ?? new Date();
  const parts = nyParts(now);
  const nowMinutes = minutesOfDay(parts.hour, parts.minute);
  const derivation: string[] = [];
  derivation.push(
    `Evaluated ${now.toISOString()} as ${parts.weekday} ${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")} in ${NY_TIME_ZONE}.`,
  );
  derivation.push(
    `Bitget market states returned market=${options.states.market}, daylightType=${options.states.daylightType}.`,
  );

  const holiday = options.calendar.holidays.find((item) => {
    const start = parseCalendarLocal(item.startTime);
    const end = parseCalendarLocal(item.endTime);
    if (!start || !end) {
      return false;
    }
    return now.getTime() >= start.getTime() && now.getTime() < end.getTime();
  });

  if (holiday) {
    derivation.push(
      `Current time falls inside Bitget calendar specificConfig ${holiday.startTime} – ${holiday.endTime}${holiday.remark ? ` (${holiday.remark})` : ""}.`,
    );
    return {
      evaluatedAt: now.toISOString(),
      timeZone: options.calendar.timeZone || NY_TIME_ZONE,
      daylightType: options.states.daylightType,
      bitgetState: null,
      marketSession: "HOLIDAY",
      underlyingUsEquity: "closed",
      holiday,
      weekend: false,
      derivation,
    };
  }

  const weekend = options.calendar.weekendDays.includes(parts.weekday);
  const matchingWindow = options.states.windows.find((window) =>
    inHmWindow(nowMinutes, window.startTime, window.endTime),
  );
  const bitgetState = matchingWindow?.state ?? null;

  if (weekend && bitgetState !== "overnight") {
    derivation.push(
      `Bitget calendar regularConfig includes ${parts.weekday}, so the US session is treated as weekend.`,
    );
    return {
      evaluatedAt: now.toISOString(),
      timeZone: options.calendar.timeZone || NY_TIME_ZONE,
      daylightType: options.states.daylightType,
      bitgetState,
      marketSession: "WEEKEND",
      underlyingUsEquity: "closed",
      weekend: true,
      derivation,
    };
  }

  if (weekend && bitgetState === "overnight") {
    derivation.push(
      `${parts.weekday} is a weekend day, but the current clock still matches Bitget overnight hours ${matchingWindow?.startTime}–${matchingWindow?.endTime}.`,
    );
  }

  let marketSession: MarketSession = "UNKNOWN";
  let underlyingUsEquity: SessionSnapshot["underlyingUsEquity"] = "unknown";
  if (bitgetState === "regular") {
    marketSession = "US_REGULAR";
    underlyingUsEquity = "regular";
  } else if (bitgetState === "pre_market") {
    marketSession = "US_PREMARKET";
    underlyingUsEquity = "extended";
  } else if (bitgetState === "after_hours") {
    marketSession = "US_AFTER_HOURS";
    underlyingUsEquity = "extended";
  } else if (bitgetState === "overnight") {
    marketSession = "US_CLOSED";
    underlyingUsEquity = "closed";
    derivation.push(
      "Overnight is a Reality trading window. The underlying US regular/extended session is closed.",
    );
  } else {
    derivation.push("No Bitget state window matched the current New York clock.");
    marketSession = weekend ? "WEEKEND" : "UNKNOWN";
    underlyingUsEquity = "closed";
  }

  if (matchingWindow) {
    derivation.push(
      `Matched Bitget state '${matchingWindow.state}' (${matchingWindow.startTime}–${matchingWindow.endTime} ${matchingWindow.timeZone}).`,
    );
  }

  return {
    evaluatedAt: now.toISOString(),
    timeZone: options.calendar.timeZone || matchingWindow?.timeZone || NY_TIME_ZONE,
    daylightType: options.states.daylightType,
    bitgetState,
    marketSession,
    underlyingUsEquity,
    weekend,
    derivation,
  };
}

export async function getSessionSnapshot(
  client: BitgetClient = getBitgetClient(),
  now?: Date,
): Promise<{
  session: SessionSnapshot;
  states: MarketStates;
  calendar: MarketCalendar;
  provenance: { states: DataProvenance; calendar: DataProvenance };
}> {
  const [statesResult, calendarResult] = await Promise.all([
    getMarketStates(client),
    getMarketCalendar(client),
  ]);
  return {
    session: deriveSessionSnapshot({
      now,
      states: statesResult.states,
      calendar: calendarResult.calendar,
    }),
    states: statesResult.states,
    calendar: calendarResult.calendar,
    provenance: {
      states: statesResult.provenance,
      calendar: calendarResult.provenance,
    },
  };
}

export function defaultUnderlyingCode(symbol: string): string {
  return underlyingFromPair(symbol);
}

export type { BitgetSessionState };
