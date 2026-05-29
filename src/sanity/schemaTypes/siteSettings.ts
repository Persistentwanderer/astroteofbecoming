import { defineType, defineField } from "sanity";

// Singleton holding site-wide settings and editable homepage content.
export const siteSettings = defineType({
	name: "siteSettings",
	title: "Site settings",
	type: "document",
	fields: [
		defineField({
			name: "title",
			title: "Site title",
			type: "string",
		}),
		defineField({
			name: "description",
			title: "Site description",
			type: "text",
			rows: 2,
		}),
		defineField({
			name: "heroHeading",
			title: "Homepage hero heading",
			type: "string",
		}),
		defineField({
			name: "heroText",
			title: "Homepage hero text",
			type: "blockContent",
		}),
		defineField({
			name: "heroImages",
			title: "Homepage hero images",
			type: "array",
			of: [
				{
					type: "image",
					options: { hotspot: true },
					fields: [
						{ name: "alt", type: "string", title: "Alt text" },
						{ name: "caption", type: "string", title: "Caption" },
					],
				},
			],
		}),
		defineField({
			name: "contactEmail",
			title: "Contact email",
			type: "string",
		}),
		defineField({
			name: "bookLink",
			title: "Book purchase link",
			type: "url",
		}),
	],
	preview: {
		prepare() {
			return { title: "Site settings" };
		},
	},
});
