import { defineType, defineArrayMember } from "sanity";

// Shared rich-text type used for stories, reflections prose, and page bodies.
export const blockContent = defineType({
	title: "Rich text",
	name: "blockContent",
	type: "array",
	of: [
		defineArrayMember({
			type: "block",
			styles: [
				{ title: "Normal", value: "normal" },
				{ title: "Heading", value: "h2" },
				{ title: "Subheading", value: "h3" },
				{ title: "Quote", value: "blockquote" },
			],
			lists: [
				{ title: "Bullet", value: "bullet" },
				{ title: "Numbered", value: "number" },
			],
			marks: {
				decorators: [
					{ title: "Strong", value: "strong" },
					{ title: "Emphasis", value: "em" },
				],
				annotations: [
					{
						title: "Link",
						name: "link",
						type: "object",
						fields: [
							{
								title: "URL",
								name: "href",
								type: "url",
								validation: (rule) =>
									rule.uri({ scheme: ["http", "https", "mailto", "tel"] }),
							},
						],
					},
				],
			},
		}),
		defineArrayMember({
			type: "image",
			options: { hotspot: true },
			fields: [{ name: "alt", type: "string", title: "Alt text" }],
		}),
	],
});
