import type { Image, PortableTextBlock } from "@sanity/types";

export interface SanityImageWithAlt extends Image {
	alt?: string;
	caption?: string;
}

export interface Chapter {
	_id: string;
	title: string;
	slug: string;
	order: number;
	featuredImage?: SanityImageWithAlt;
	intro?: PortableTextBlock[];
}

export interface Section {
	_id: string;
	title: string;
	slug: string;
	order: number;
	chapter?: { title: string; slug: string };
	featuredImage?: SanityImageWithAlt;
	reflection?: string[];
	story?: PortableTextBlock[];
}

export interface GalleryItem {
	_id: string;
	title: string;
	author?: string;
	order?: number;
	image: SanityImageWithAlt;
	description?: PortableTextBlock[];
	videoUrl?: string;
	videoFileUrl?: string;
	audioUrl?: string;
	externalLink?: string;
	fullStory?: PortableTextBlock[];
	titleStyle?: "default" | "wacky";
}

export interface Gallery {
	_id: string;
	title: string;
	slug: string;
	columns?: number;
	intro?: PortableTextBlock[];
	items: GalleryItem[];
}

export interface Page {
	_id: string;
	title: string;
	slug: string;
	body?: PortableTextBlock[];
}

export interface Contributor {
	_id: string;
	name: string;
	slug?: string;
	image?: SanityImageWithAlt;
	bio?: PortableTextBlock[];
}

export interface SiteSettings {
	title?: string;
	description?: string;
	heroHeading?: string;
	heroText?: PortableTextBlock[];
	heroImages?: SanityImageWithAlt[];
	contactEmail?: string;
	bookLink?: string;
}
