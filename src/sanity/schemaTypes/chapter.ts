import { defineType, defineField } from "sanity";

export const chapter = defineType({
	name: "chapter",
	title: "Chapter",
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
			name: "order",
			title: "Order",
			type: "number",
			description: "Controls the position of this chapter in the book / nav.",
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
			name: "intro",
			title: "Introduction",
			type: "blockContent",
		}),
	],
	orderings: [
		{
			title: "Book order",
			name: "orderAsc",
			by: [{ field: "order", direction: "asc" }],
		},
	],
	preview: {
		select: { title: "title", order: "order", media: "featuredImage" },
		prepare({ title, order, media }) {
			return { title, subtitle: `Chapter ${order}`, media };
		},
	},
});
