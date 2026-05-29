// @ts-check
import { defineConfig, envField } from "astro/config";
import { loadEnv } from "vite";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";
import sanity from "@sanity/astro";
import cloudflare from "@astrojs/cloudflare";
import wrangler from "./wrangler.json" with { type: "json" };
import {
	resolveSanityEnv,
	SANITY_DATASET,
	SANITY_PROJECT_ID,
} from "./sanity.project.mjs";

// Wrangler vars are the deployment source of truth when .env isn't present
// (e.g. Cloudflare Workers Builds). Local .env overrides for development.
for (const [key, value] of Object.entries(wrangler.vars ?? {})) {
	if (process.env[key] === undefined) {
		process.env[key] = String(value);
	}
}

const viteEnv = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");
const { projectId: PUBLIC_SANITY_PROJECT_ID, dataset: PUBLIC_SANITY_DATASET } =
	resolveSanityEnv({ ...process.env, ...viteEnv });

// https://astro.build/config
export default defineConfig({
	site: "https://astateofbecoming.com",
	output: "server",
	env: {
		schema: {
			PUBLIC_SANITY_PROJECT_ID: envField.string({
				context: "client",
				access: "public",
				default: SANITY_PROJECT_ID,
			}),
			PUBLIC_SANITY_DATASET: envField.string({
				context: "client",
				access: "public",
				default: SANITY_DATASET,
			}),
		},
	},
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
