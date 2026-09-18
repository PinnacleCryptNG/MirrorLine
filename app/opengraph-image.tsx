import { ImageResponse } from "next/og";

export const alt = "Mirrorline · Evidence-First Trading Desk for Bitget Reality rTokens";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          backgroundColor: "#FAF8F5",
          padding: "60px 80px",
          fontFamily: "sans-serif",
          border: "16px solid #2D5A3C",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              backgroundColor: "#2D5A3C",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FAF8F5",
              fontSize: "28px",
              fontWeight: 800,
            }}
          >
            M
          </div>
          <span
            style={{
              fontSize: "32px",
              fontWeight: 800,
              color: "#1F2421",
              letterSpacing: "-0.5px",
            }}
          >
            MIRRORLINE
          </span>
          <span
            style={{
              fontSize: "16px",
              backgroundColor: "#E8F0EA",
              color: "#2D5A3C",
              padding: "6px 14px",
              borderRadius: "9999px",
              fontWeight: 600,
              marginLeft: "12px",
            }}
          >
            Bitget AI Hackathon Genesis Season 2
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h1
            style={{
              fontSize: "56px",
              fontWeight: 800,
              color: "#1F2421",
              lineHeight: 1.15,
              maxWidth: "1000px",
              letterSpacing: "-1px",
              margin: 0,
            }}
          >
            Check if your trading idea matches Bitget’s real data
          </h1>
          <p
            style={{
              fontSize: "26px",
              color: "#5C6460",
              lineHeight: 1.4,
              maxWidth: "900px",
              margin: 0,
            }}
          >
            Mirrorline helps you verify what Reality rToken market data supports—and what it doesn’t—before you act.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            fontSize: "20px",
            fontWeight: 600,
            color: "#2D5A3C",
            borderTop: "2px solid #E5DFD5",
            paddingTop: "24px",
            width: "100%",
          }}
        >
          <span>Free Research Tool</span>
          <span>•</span>
          <span>Zero Fabricated Data</span>
          <span>•</span>
          <span>No Buy/Sell Signals</span>
          <span>•</span>
          <span>No Trade Execution</span>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
