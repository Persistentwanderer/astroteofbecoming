import { defineType, defineField } from "sanity";

// A contributor's creative response shown in a gallery (e.g. "What is your power").
// Images + audio live in Sanity; video is referenced externally (Cloudflare
// Stream / Vimeo / YouTube) to avoid large video assets in the dataset.
export const galleryItem = defineType({
	name: "galleryItem",
	title: "Gallery item",
	type: "document",
	fields: [
		defineField({
			name: "title",
			title: "Title",
			type: "string",
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: "author",
			title: "Author / contributor",
			type: "string",
		}),
		defineField({
			name: "gallery",
			title: "Gallery",
			description: "Which gallery this belongs to (e.g. what-is-your-power).",
			type: "reference",
			to: [{ type: "gallery" }],
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: "order",
			title: "Order",
			type: "number",
			initialValue: 0,
		}),
		defineField({
			name: "image",
			title: "Image",
			description: "Thumbnail shown in the grid and the main lightbox image.",
			type: "image",
			options: { hotspot: true },
			fields: [{ name: "alt", type: "string", title: "Alt text" }],
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: "description",
			title: "Description",
			type: "blockContent",
		}),
		defineField({
			name: "videoFile",
			title: "Video file",
			description:
				"Optional. Upload an optimised video (plays inline in the lightbox).",
			type: "file",
			options: { accept: "video/*" },
		}),
		defineField({
			name: "videoUrl",
			title: "Video URL",
			description:
				"Optional external video instead of an upload (Vimeo / YouTube / direct .mp4 link).",
			type: "url",
		}),
		defineField({
			name: "audio",
			title: "Audio",
			description: "Optional audio file played in the lightbox.",
			type: "file",
			options: { accept: "audio/*" },
		}),
		defineField({
			name: "externalLink",
			title: "External link",
			description: "Optional 'click through' link (e.g. to a PDF or video).",
			type: "url",
		}),
		defineField({
			name: "fullStory",
			title: "Full story",
			description: "Optional longer piece shown via a 'read full text' link.",
			type: "blockContent",
		}),
		defineField({
			name: "titleStyle",
			title: "Title style",
			type: "string",
			options: {
				list: [
					{ title: "Default", value: "default" },
					{ title: "Wacky", value: "wacky" },
				],
				layout: "radio",
			},
			initialValue: "default",
		}),
	],
	orderings: [
		{
			title: "Display order",
			name: "orderAsc",
			by: [{ field: "order", direction: "asc" }],
		},
	],
	preview: {
		select: { title: "title", author: "author", media: "image" },
		prepare({ title, author, media }) {
			return { title, subtitle: author, media };
		},
	},
});
