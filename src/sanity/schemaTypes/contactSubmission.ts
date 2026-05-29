import { defineType, defineField } from "sanity";

export const contactSubmission = defineType({
	name: "contactSubmission",
	title: "Contact submission",
	type: "document",
	fields: [
		defineField({
			name: "name",
			title: "Name",
			type: "string",
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: "email",
			title: "Email",
			type: "string",
			validation: (rule) => rule.required().email(),
		}),
		defineField({
			name: "chapter",
			title: "Chapter",
			type: "string",
		}),
		defineField({
			name: "workTitle",
			title: "Work title",
			type: "string",
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: "message",
			title: "Message",
			type: "text",
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: "link",
			title: "Link",
			type: "url",
		}),
		defineField({
			name: "submittedAt",
			title: "Submitted at",
			type: "datetime",
			initialValue: () => new Date().toISOString(),
		}),
	],
	orderings: [
		{
			title: "Submitted, newest",
			name: "submittedAtDesc",
			by: [{ field: "submittedAt", direction: "desc" }],
		},
	],
	preview: {
		select: { workTitle: "workTitle", name: "name", subtitle: "email", chapter: "chapter" },
		prepare({ workTitle, name, subtitle, chapter }) {
			return {
				title: workTitle || name,
				subtitle: chapter ? `${subtitle} · ${chapter}` : subtitle,
			};
		},
	},
});
