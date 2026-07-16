import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 7,
          background: "linear-gradient(135deg, #ff5a1f 0%, #ff8f3d 100%)",
        }}
      >
        <span
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "white",
            fontFamily: "sans-serif",
          }}
        >
          P
        </span>
      </div>
    ),
    { ...size }
  );
}
