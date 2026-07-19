import type { Metadata } from "next";

export { revalidate } from "@/app/about/page";
export { default } from "@/app/about/page";

const HOMEPAGE_DESCRIPTION =
  "Explore a global map of the zine universe, map your local zine scene, and connect with other zine makers worldwide.";

export const metadata: Metadata = {
  title: "ZineMap - A Collaborative Map of the Global Zine Scene",
  description: HOMEPAGE_DESCRIPTION,
  alternates: {
    canonical: "https://zinemap.com",
  },
  openGraph: {
    title: "ZineMap - A Collaborative Map of the Global Zine Scene",
    description: HOMEPAGE_DESCRIPTION,
    url: "https://zinemap.com",
    siteName: "ZineMap",
    images: [
      {
        url: "/preview-image.png",
        width: 1200,
        height: 630,
        alt: "ZineMap - A Collaborative Map of the Global Zine Scene",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZineMap - A Collaborative Map of the Global Zine Scene",
    description: HOMEPAGE_DESCRIPTION,
    images: ["/preview-image.png"],
  },
};
