import { blockContent } from "./blockContent";
import { chapter } from "./chapter";
import { section } from "./section";
import { gallery } from "./gallery";
import { galleryItem } from "./galleryItem";
import { contributor } from "./contributor";
import { page } from "./page";
import { siteSettings } from "./siteSettings";

export const schemaTypes = [
	// Documents
	siteSettings,
	chapter,
	section,
	gallery,
	galleryItem,
	contributor,
	page,
	// Objects
	blockContent,
];
