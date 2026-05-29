import { sanityClient } from "sanity:client";
import {
	sortChaptersByBookOrder,
	withChapterDisplayTitle,
	withSectionChapterDisplayTitle,
} from "../chapterOrder";
import type {
	Chapter,
	Section,
	Gallery,
	Page,
	Contributor,
	SiteSettings,
} from "./types";

// --- GROQ projections -------------------------------------------------------

const imageProjection = `{ ..., "alt": alt, "caption": caption }`;

const chapterFields = `
	_id,
	title,
	"slug": slug.current,
	order,
	featuredImage ${imageProjection},
	intro
`;

const sectionFields = `
	_id,
	title,
	"slug": slug.current,
	order,
	chapter->{ title, "slug": slug.current },
	featuredImage ${imageProjection},
	reflection,
	story
`;

const galleryItemFields = `
	_id,
	title,
	author,
	order,
	image ${imageProjection},
	description,
	videoUrl,
	"videoFileUrl": videoFile.asset->url,
	"audioUrl": audio.asset->url,
	externalLink,
	fullStory,
	titleStyle
`;

// Section fields plus its (optional) embedded gallery and resolved items.
const sectionWithGalleryFields = `
	${sectionFields},
	gallery->{
		_id,
		title,
		columns,
		"items": *[_type == "galleryItem" && gallery._ref == ^._id] | order(order asc){${galleryItemFields}}
	}
`;

// --- Queries ----------------------------------------------------------------

export async function getSiteSettings(): Promise<SiteSettings | null> {
	return sanityClient.fetch(
		`*[_type == "siteSettings"][0]{
			title, description, heroHeading, heroText,
			heroImages[]${imageProjection}, contactEmail, bookLink
		}`,
	);
}

export async function getChapters(): Promise<Chapter[]> {
	const chapters = await sanityClient.fetch<Chapter[]>(
		`*[_type == "chapter"]{${chapterFields}}`,
	);
	return sortChaptersByBookOrder(chapters).map(withChapterDisplayTitle);
}

export async function getChapterBySlug(slug: string): Promise<
	(Chapter & { sections: Section[] }) | null
> {
	const chapter = await sanityClient.fetch<
		(Chapter & { sections: Section[] }) | null
	>(
		`*[_type == "chapter" && slug.current == $slug][0]{
			${chapterFields},
			"sections": *[_type == "section" && chapter._ref == ^._id] | order(order asc){${sectionFields}}
		}`,
		{ slug },
	);
	if (!chapter) return null;
	return {
		...withChapterDisplayTitle(chapter),
		sections: chapter.sections.map(withSectionChapterDisplayTitle),
	};
}

export async function getChapterSections(
	chapterSlug: string,
): Promise<Section[]> {
	const sections = await sanityClient.fetch<Section[]>(
		`*[_type == "section" && chapter->slug.current == $chapterSlug] | order(order asc){${sectionWithGalleryFields}}`,
		{ chapterSlug },
	);
	return sections.map(withSectionChapterDisplayTitle);
}

export const POWER_CHAPTER_SLUG = "you-know-what-you-have-to-do";
export const POWER_GALLERY_SLUG = "what-is-your-power";
export const POWER_COVER_PATH = `/chapters/${POWER_CHAPTER_SLUG}/${POWER_GALLERY_SLUG}/featured.jpg`;

function buildPowerSection(gallery: Gallery): Section {
	return {
		_id: gallery._id,
		title: gallery.title.replace(/\?$/, "") || "What is your power",
		slug: POWER_GALLERY_SLUG,
		order: 1,
		gallery: {
			_id: gallery._id,
			title: gallery.title,
			columns: gallery.columns,
			items: gallery.items,
		},
	};
}

/** Inject the power gallery as the first section when chapter 1 has no matching section yet. */
function mergePowerSection(sections: Section[], gallery: Gallery | null): Section[] {
	if (
		!gallery ||
		sections.some((s) => s.slug === POWER_GALLERY_SLUG)
	) {
		return sections;
	}
	return [buildPowerSection(gallery), ...sections].sort(
		(a, b) => a.order - b.order,
	);
}

/** All sections for a chapter, including the power gallery when applicable. */
export async function getChapterSectionsWithPower(
	chapterSlug: string,
): Promise<Section[]> {
	const [sections, gallery] = await Promise.all([
		getChapterSections(chapterSlug),
		chapterSlug === POWER_CHAPTER_SLUG
			? getGalleryBySlug(POWER_GALLERY_SLUG)
			: Promise.resolve(null),
	]);
	return mergePowerSection(sections, gallery);
}

/** First four homepage dropdown panels, including the power gallery when no section exists yet. */
export async function getHomepagePanels(
	chapterSlug: string,
): Promise<Section[]> {
	const sections = await getChapterSectionsWithPower(chapterSlug);
	return sections.slice(0, 4);
}

export async function getSectionBySlug(
	chapterSlug: string,
	sectionSlug: string,
): Promise<Section | null> {
	const section = await sanityClient.fetch<Section | null>(
		`*[_type == "section" && slug.current == $sectionSlug && chapter->slug.current == $chapterSlug][0]{${sectionFields}}`,
		{ chapterSlug, sectionSlug },
	);
	return section ? withSectionChapterDisplayTitle(section) : null;
}

export async function getSectionWithGalleryBySlug(
	chapterSlug: string,
	sectionSlug: string,
): Promise<Section | null> {
	const section = await sanityClient.fetch<Section | null>(
		`*[_type == "section" && slug.current == $sectionSlug && chapter->slug.current == $chapterSlug][0]{${sectionWithGalleryFields}}`,
		{ chapterSlug, sectionSlug },
	);
	if (section) return withSectionChapterDisplayTitle(section);

	if (
		chapterSlug === POWER_CHAPTER_SLUG &&
		sectionSlug === POWER_GALLERY_SLUG
	) {
		const [gallery, chapter] = await Promise.all([
			getGalleryBySlug(POWER_GALLERY_SLUG),
			getChapterBySlug(POWER_CHAPTER_SLUG),
		]);
		if (!gallery) return null;
		const power = buildPowerSection(gallery);
		if (chapter) {
			power.chapter = { title: chapter.title, slug: chapter.slug };
		}
		return power;
	}

	return null;
}

export async function getAllSectionPaths(): Promise<
	{ chapter: string; section: string }[]
> {
	const paths = await sanityClient.fetch<
		{ chapter: string; section: string }[]
	>(
		`*[_type == "section" && defined(slug.current) && defined(chapter->slug.current)]{
			"section": slug.current,
			"chapter": chapter->slug.current
		}`,
	);

	const hasPowerPath = paths.some(
		(p) =>
			p.chapter === POWER_CHAPTER_SLUG &&
			p.section === POWER_GALLERY_SLUG,
	);
	if (!hasPowerPath) {
		const gallery = await getGalleryBySlug(POWER_GALLERY_SLUG);
		if (gallery) {
			paths.push({
				chapter: POWER_CHAPTER_SLUG,
				section: POWER_GALLERY_SLUG,
			});
		}
	}

	return paths;
}

export async function getGalleryBySlug(slug: string): Promise<Gallery | null> {
	return sanityClient.fetch(
		`*[_type == "gallery" && slug.current == $slug][0]{
			_id, title, "slug": slug.current, columns, intro,
			"items": *[_type == "galleryItem" && gallery._ref == ^._id] | order(order asc){${galleryItemFields}}
		}`,
		{ slug },
	);
}

export async function getPageBySlug(slug: string): Promise<Page | null> {
	return sanityClient.fetch(
		`*[_type == "page" && slug.current == $slug][0]{ _id, title, "slug": slug.current, body }`,
		{ slug },
	);
}

export async function getContributors(): Promise<Contributor[]> {
	return sanityClient.fetch(
		`*[_type == "contributor"] | order(name asc){
			_id, name, "slug": slug.current, image ${imageProjection}, bio
		}`,
	);
}
