import { sanityClient } from "sanity:client";
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
	return sanityClient.fetch(
		`*[_type == "chapter"] | order(order asc){${chapterFields}}`,
	);
}

export async function getChapterBySlug(slug: string): Promise<
	(Chapter & { sections: Section[] }) | null
> {
	return sanityClient.fetch(
		`*[_type == "chapter" && slug.current == $slug][0]{
			${chapterFields},
			"sections": *[_type == "section" && chapter._ref == ^._id] | order(order asc){${sectionFields}}
		}`,
		{ slug },
	);
}

export async function getChapterSections(
	chapterSlug: string,
): Promise<Section[]> {
	return sanityClient.fetch(
		`*[_type == "section" && chapter->slug.current == $chapterSlug] | order(order asc){${sectionWithGalleryFields}}`,
		{ chapterSlug },
	);
}

export async function getSectionBySlug(
	chapterSlug: string,
	sectionSlug: string,
): Promise<Section | null> {
	return sanityClient.fetch(
		`*[_type == "section" && slug.current == $sectionSlug && chapter->slug.current == $chapterSlug][0]{${sectionFields}}`,
		{ chapterSlug, sectionSlug },
	);
}

export async function getAllSectionPaths(): Promise<
	{ chapter: string; section: string }[]
> {
	return sanityClient.fetch(
		`*[_type == "section" && defined(slug.current) && defined(chapter->slug.current)]{
			"section": slug.current,
			"chapter": chapter->slug.current
		}`,
	);
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
