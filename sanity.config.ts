import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./src/sanity/schemaTypes";
import { resolveSanityEnv } from "./sanity.project.mjs";

// Studio runs in the browser; env is baked in at build time. Cloudflare Builds
// may set PUBLIC_SANITY_* to empty strings, so fall back to committed defaults.
const { projectId, dataset } = resolveSanityEnv(import.meta.env);

// Custom desk structure: siteSettings is a singleton, everything else is a list.
const structure = (S: any) =>
	S.list()
		.title("Content")
		.items([
			S.listItem()
				.title("Site settings")
				.id("siteSettings")
				.child(
					S.document().schemaType("siteSettings").documentId("siteSettings"),
				),
			S.divider(),
			S.documentTypeListItem("chapter").title("Chapters"),
			S.documentTypeListItem("section").title("Sections"),
			S.divider(),
			S.documentTypeListItem("gallery").title("Galleries"),
			S.documentTypeListItem("galleryItem").title("Gallery items"),
			S.divider(),
			S.documentTypeListItem("contributor").title("Contributors"),
			S.documentTypeListItem("page").title("Pages"),
			S.documentTypeListItem("contactSubmission").title("Contact submissions"),
		]);

export default defineConfig({
	name: "astateofbecoming",
	title: "A State of Becoming",
	projectId,
	dataset,
	plugins: [structureTool({ structure }), visionTool()],
	schema: {
		types: schemaTypes,
	},
});
