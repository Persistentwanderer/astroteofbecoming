import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./src/sanity/schemaTypes";

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID as string;
const dataset = (import.meta.env.PUBLIC_SANITY_DATASET as string) ?? "production";

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
