import { defineType, defineField } from "sanity";

// Generic editable page (About, Contact, etc.).
export const page = defineType({
	name: "page",
	title: "Page",
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
			name: "body",
			title: "Body",
			type: "blockContent",
		}),
	],
	preview: {
		select: { title: "title", slug: "slug.current" },
		prepare({ title, slug }) {
			return { title, subtitle: slug ? `/${slug}` : undefined };
		},
	},
});
