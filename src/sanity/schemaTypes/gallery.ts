import { defineType, defineField } from "sanity";

// A named collection of gallery items, optionally tied to a chapter/section.
export const gallery = defineType({
	name: "gallery",
	title: "Gallery",
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
			name: "columns",
			title: "Columns",
			type: "number",
			initialValue: 3,
			validation: (rule) => rule.min(1).max(4),
		}),
		defineField({
			name: "intro",
			title: "Introduction",
			type: "blockContent",
		}),
	],
	preview: {
		select: { title: "title" },
	},
});
