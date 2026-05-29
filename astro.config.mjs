// @ts-check
import { defineConfig } from "astro/config";
import { loadEnv } from "vite";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";
import sanity from "@sanity/astro";
import cloudflare from "@astrojs/cloudflare";

const {
	PUBLIC_SANITY_PROJECT_ID = "",
	PUBLIC_SANITY_DATASET = "production",
} = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");

// https://astro.build/config
export default defineConfig({
	site: "https://astateofbecoming.com",
	output: "server",
	integrations: [
		sanity({
			projectId: PUBLIC_SANITY_PROJECT_ID,
			dataset: PUBLIC_SANITY_DATASET,
			// Use the live API while editing; flip to true for cached reads.
			useCdn: false,
			apiVersion: "2024-12-01",
			// Embedded Studio served at /studio so the client can edit content.
			studioBasePath: "/studio",
		}),
		react(),
		mdx(),
		sitemap(),
	],
	adapter: cloudflare({
		platformProxy: {
			enabled: true,
		},
		// Images are served from Sanity's CDN, so no runtime sharp is needed.
		imageService: "passthrough",
	}),
});
