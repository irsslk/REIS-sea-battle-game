import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "REIS Sea Battle",
    short_name: "REIS",
    description: "Modern sea battle game for CIS and Asia.",
    start_url: "/ru",
    display: "standalone",
    background_color: "#071a34",
    theme_color: "#071a34",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
