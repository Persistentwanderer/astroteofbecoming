import { defineType, defineField } from "sanity";

// A section maps to the old Hugo "_index.md" inside a chapter:
// a set of short reflection lines plus a longer story.
export const section = defineType({
	name: "section",
	title: "Section",
	type: "document",
	fields: [
		defineField({
			name: "title",
			title: "Title",
			type: "string",
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: "slug",
			title: "Slug",
			type: "slug",
			options: { source: "title", maxLength: 96 },
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: "chapter",
			title: "Chapter",
			type: "reference",
			to: [{ type: "chapter" }],
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: "order",
			title: "Order within chapter",
			type: "number",
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: "featuredImage",
			title: "Featured image",
			type: "image",
			options: { hotspot: true },
			fields: [{ name: "alt", type: "string", title: "Alt text" }],
		}),
		defineField({
			name: "reflection",
			title: "Reflection",
			description: "Short reflective prompts (one per line).",
			type: "array",
			of: [{ type: "string" }],
		}),
		defineField({
			name: "story",
			title: "Story",
			type: "blockContent",
		}),
	],
	orderings: [
		{
			title: "Order within chapter",
			name: "orderAsc",
			by: [{ field: "order", direction: "asc" }],
		},
	],
	preview: {
		select: { title: "title", chapter: "chapter.title", media: "featuredImage" },
		prepare({ title, chapter, media }) {
			return { title, subtitle: chapter, media };
		},
	},
});
