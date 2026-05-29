import { createImageUrlBuilder } from "@sanity/image-url";
import type { Image } from "@sanity/types";
import { sanityClient } from "sanity:client";

const builder = createImageUrlBuilder(sanityClient);

// Build an image URL from a Sanity image reference. Chain Sanity's image
// pipeline helpers, e.g. urlFor(image).width(800).url().
export function urlFor(source: Image) {
	return builder.image(source);
}
