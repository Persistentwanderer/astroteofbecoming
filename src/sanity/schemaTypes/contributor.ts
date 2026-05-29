import { defineType, defineField } from "sanity";

export const contributor = defineType({
	name: "contributor",
	title: "Contributor",
	type: "document",
	fields: [
		defineField({
			name: "name",
			title: "Name",
			type: "string",
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: "slug",
			title: "Slug",
			type: "slug",
			options: { source: "name", maxLength: 96 },
		}),
		defineField({
			name: "image",
			title: "Photo",
			type: "image",
			options: { hotspot: true },
		}),
		defineField({
			name: "bio",
			title: "Bio",
			type: "blockContent",
		}),
	],
	preview: {
		select: { title: "name", media: "image" },
	},
});
