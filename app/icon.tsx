import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 20,
          background: "#2D5A3C",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#F6F4EE",
          borderRadius: "6px",
          fontWeight: 700,
          fontFamily: "sans-serif",
          border: "1px solid #1E3D29",
        }}
      >
        M
      </div>
    ),
    {
      ...size,
    },
  );
}
