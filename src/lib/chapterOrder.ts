/** Canonical chapter order from the book (matches scripts/migrate.mjs). */
export const CHAPTER_ORDER: Record<string, number> = {
	"you-know-what-you-have-to-do": 1,
	"what-can-you-change": 2,
	"what-needs-to-stay-the-same": 3,
	"how-will-you-measure-success": 4,
	"how-do-you-know": 5,
	"look-closer": 6,
	"consider-the-possibilities": 7,
	"find-the-constant": 8,
	"change-the-approach": 9,
	"what-happens-next": 10,
};

export function chapterBookOrder(slug: string, fallback = 999): number {
	return CHAPTER_ORDER[slug] ?? fallback;
}

/** Sentence case for CMS titles stored in ALL CAPS (homepage uses CSS uppercase). */
export function formatChapterTitle(title: string): string {
	const trimmed = title.trim();
	if (!trimmed) return trimmed;
	const letters = trimmed.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, "");
	if (letters.length > 0 && letters === letters.toUpperCase()) {
		return trimmed.charAt(0) + trimmed.slice(1).toLowerCase();
	}
	return trimmed;
}

export function withChapterDisplayTitle<T extends { title: string }>(
	chapter: T,
): T {
	return { ...chapter, title: formatChapterTitle(chapter.title) };
}

export function withSectionChapterDisplayTitle<
	T extends { chapter?: { title: string; slug: string } },
>(section: T): T {
	if (!section.chapter) return section;
	return { ...section, chapter: withChapterDisplayTitle(section.chapter) };
}

/** Sort chapters in book order and normalise the display order field. */
export function sortChaptersByBookOrder<T extends { slug: string; order: number }>(
	chapters: T[],
): T[] {
	return [...chapters]
		.sort(
			(a, b) =>
				chapterBookOrder(a.slug, a.order) - chapterBookOrder(b.slug, b.order),
		)
		.map((chapter) => ({
			...chapter,
			order: chapterBookOrder(chapter.slug, chapter.order),
		}));
}
