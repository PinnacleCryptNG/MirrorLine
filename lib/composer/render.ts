import type { StructuredClaim } from "@/lib/challenge/types";
import { joinClaimSentences } from "@/lib/revision/claims";
import { kindDef } from "./schema";

export type ComposerGuard =
  | "engine"
  | "timeframe-not-24h"
  | "session-specific"
  | "spread-observed"
  | "public-uta";

export interface RenderedStructuredClaim {
  claim: StructuredClaim;
  text: string;
  guard: ComposerGuard;
  limitation: string;
}

function withExplanation(base: string, claim: StructuredClaim): string {
  const extra = claim.explanation?.trim().replace(/[.!?]+/g, ",").replace(/,\s*$/, "");
  const core = base.trim().replace(/[.!?]+$/, "");
  if (!extra) {
    return `${core}.`;
  }
  return `${core} — ${extra}.`;
}

export function renderStructuredClaim(claim: StructuredClaim): RenderedStructuredClaim {
  const def = kindDef(claim.kind);
  const limitation = def?.limitation ?? "Structured input is not a verified fact.";
  const fields = claim.fields;

  if (claim.kind === "price.direction") {
    const direction = fields.direction === "up" ? "up" : "down";
    const timeframe = fields.timeframe || "unspecified";
    if (timeframe === "24h") {
      return {
        claim,
        text: withExplanation(`Bitget 24-hour price change is ${direction}.`, claim),
        guard: "engine",
        limitation,
      };
    }
    const article = timeframe === "unspecified" || timeframe === "intraday" ? "an" : "a";
    return {
      claim,
      text: withExplanation(
        `This direction claim uses ${article} ${timeframe} timeframe that Bitget 24-hour change evidence cannot score`,
        claim,
      ),
      guard: "timeframe-not-24h",
      limitation,
    };
  }

  if (claim.kind === "price.change24h") {
    const sign = fields.sign === "up" ? "up" : fields.sign === "flat" ? "unchanged" : "down";
    const verb = sign === "unchanged" ? "is unchanged" : `is ${sign}`;
    return {
      claim,
      text: withExplanation(`The Bitget 24-hour change ${verb}.`, claim),
      guard: "engine",
      limitation,
    };
  }

  if (claim.kind === "session.us") {
    const state = fields.state || "closed";
    if (state === "open" || state === "regular") {
      return {
        claim,
        text: withExplanation("The US stock market is open.", claim),
        guard: state === "regular" ? "session-specific" : "engine",
        limitation,
      };
    }
    if (state === "closed") {
      return {
        claim,
        text: withExplanation("The US stock market is closed.", claim),
        guard: "engine",
        limitation,
      };
    }
    return {
      claim,
      text: withExplanation(`The claimed US session window is ${state.replaceAll("_", " ")}.`, claim),
      guard: "session-specific",
      limitation,
    };
  }

  if (claim.kind === "underlying.named") {
    const relationship = fields.relationship || "tracks";
    const code = fields.code?.trim();
    const target = code ? `the ${code} underlying` : "the named underlying";
    return {
      claim,
      text: withExplanation(`This rToken ${relationship} ${target}.`, claim),
      guard: "engine",
      limitation,
    };
  }

  if (claim.kind === "reference.tape") {
    const comparison = fields.comparison || "cheap";
    const phrase =
      comparison === "divergence"
        ? "diverges from the US stock"
        : comparison === "premium" || comparison === "expensive"
          ? "is expensive versus the US stock"
          : "is cheap versus the US stock";
    return {
      claim,
      text: withExplanation(`The token ${phrase}.`, claim),
      guard: "engine",
      limitation,
    };
  }

  if (claim.kind === "news.catalyst") {
    const attribution = fields.attribution || "news";
    if (attribution === "unknown-cause") {
      return {
        claim,
        text: withExplanation("News context for this rToken remains unanswered.", claim),
        guard: "engine",
        limitation,
      };
    }
    const label = attribution === "earnings" ? "earnings news" : attribution === "catalyst" ? "a catalyst" : "news";
    return {
      claim,
      text: withExplanation(`The 24-hour move happened because of ${label}.`, claim),
      guard: "engine",
      limitation,
    };
  }

  if (claim.kind === "liquidity.spread") {
    if (fields.aspect === "spread-observed") {
      return {
        claim,
        text: withExplanation("A derived bid-ask spread is observed on the Bitget ticker.", claim),
        guard: "spread-observed",
        limitation,
      };
    }
    return {
      claim,
      text: withExplanation("The book is liquid and executable.", claim),
      guard: "engine",
      limitation,
    };
  }

  if (claim.kind === "depth.book") {
    if (fields.book === "public-uta") {
      return {
        claim,
        text: withExplanation("A public UTA order-book snapshot is present.", claim),
        guard: "public-uta",
        limitation,
      };
    }
    return {
      claim,
      text: withExplanation("Reality 40-level depth is available.", claim),
      guard: "engine",
      limitation,
    };
  }

  return {
    claim,
    text: withExplanation(fields.text || "", claim),
    guard: "engine",
    limitation,
  };
}

export function renderComposerThesis(claims: StructuredClaim[], freeText?: string): string {
  const parts = claims.map((claim) => renderStructuredClaim(claim).text).filter((text) => text.trim().length > 0);
  if (freeText?.trim()) {
    parts.push(freeText.trim());
  }
  return joinClaimSentences(parts);
}
