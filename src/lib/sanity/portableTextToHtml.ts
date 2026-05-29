import type { PortableTextBlock } from "@sanity/types";

// Minimal Portable Text -> HTML serializer for inline use in data attributes
// (e.g. the gallery lightbox description). Handles the block/mark features
// used across the migrated content: paragraphs, headings, quotes, lists,
// strong/em, and links. For full page rendering, prefer the RichText component.

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

interface Span {
	_type: "span";
	text?: string;
	marks?: string[];
}

interface MarkDef {
	_key: string;
	_type: string;
	href?: string;
}

function renderSpan(span: Span, markDefs: MarkDef[]): string {
	let html = escapeHtml(span.text ?? "").replace(/\n/g, "<br>");
	for (const mark of span.marks ?? []) {
		if (mark === "strong") {
			html = `<strong>${html}</strong>`;
		} else if (mark === "em") {
			html = `<em>${html}</em>`;
		} else {
			const def = markDefs.find((d) => d._key === mark);
			if (def?._type === "link" && def.href) {
				const safeHref = escapeHtml(def.href);
				html = `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${html}</a>`;
			}
		}
	}
	return html;
}

export function portableTextToHtml(
	blocks?: PortableTextBlock[] | null,
): string {
	if (!blocks || blocks.length === 0) return "";

	const html: string[] = [];
	let listType: "ul" | "ol" | null = null;

	const closeList = () => {
		if (listType) {
			html.push(`</${listType}>`);
			listType = null;
		}
	};

	for (const block of blocks) {
		if (block._type !== "block") continue;
		const spans = (block.children ?? []) as Span[];
		const markDefs = (block.markDefs ?? []) as MarkDef[];
		const inner = spans.map((s) => renderSpan(s, markDefs)).join("");

		if (block.listItem) {
			const want = block.listItem === "number" ? "ol" : "ul";
			if (listType !== want) {
				closeList();
				html.push(`<${want}>`);
				listType = want;
			}
			html.push(`<li>${inner}</li>`);
			continue;
		}

		closeList();
		const style = block.style ?? "normal";
		if (style === "blockquote") {
			html.push(`<blockquote>${inner}</blockquote>`);
		} else if (/^h[1-6]$/.test(style)) {
			html.push(`<${style}>${inner}</${style}>`);
		} else {
			html.push(`<p>${inner}</p>`);
		}
	}
	closeList();
	return html.join("");
}
