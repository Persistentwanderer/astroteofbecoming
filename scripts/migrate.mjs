/**
 * One-off migration: imports the existing Hugo content from the old site into
 * Sanity. Run once after creating your Sanity project and a write token.
 *
 * Usage:
 *   PUBLIC_SANITY_PROJECT_ID=xxxx \
 *   PUBLIC_SANITY_DATASET=production \
 *   SANITY_API_WRITE_TOKEN=sk... \
 *   node scripts/migrate.mjs
 *
 * The old Hugo content is expected one level up (../content). Override with
 * OLD_SITE_DIR if it lives elsewhere.
 */
import { createClient } from "@sanity/client";
import matter from "gray-matter";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, basename, dirname, extname } from "node:path";

const PROJECT_ID = process.env.PUBLIC_SANITY_PROJECT_ID;
const DATASET = process.env.PUBLIC_SANITY_DATASET || "production";
// Accept either name; the token must have write (Editor) permissions.
const TOKEN =
	process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_READ_TOKEN;
const OLD_SITE_DIR = process.env.OLD_SITE_DIR || join(process.cwd(), "..");
const CONTENT_DIR = join(OLD_SITE_DIR, "content");
const CHAPTERS_DIR = join(CONTENT_DIR, "chapters");

// Limit which chapters are migrated. Defaults to only the first chapter for
// now; override with e.g. ONLY_CHAPTERS=all or a comma-separated slug list:
//   ONLY_CHAPTERS=all npm run migrate
//   ONLY_CHAPTERS=look-closer,find-the-constant npm run migrate
const ONLY_CHAPTERS = (
	process.env.ONLY_CHAPTERS ?? "you-know-what-you-have-to-do"
)
	.split(",")
	.map((s) => s.trim())
	.filter(Boolean);
const MIGRATE_ALL = ONLY_CHAPTERS.includes("all");

if (!PROJECT_ID || !TOKEN) {
	console.error(
		"Missing PUBLIC_SANITY_PROJECT_ID or SANITY_API_WRITE_TOKEN env vars.",
	);
	process.exit(1);
}

const client = createClient({
	projectId: PROJECT_ID,
	dataset: DATASET,
	token: TOKEN,
	apiVersion: "2024-12-01",
	useCdn: false,
});

// --- helpers ----------------------------------------------------------------

function decodeEntities(str) {
	return str
		.replace(/&rsquo;/g, "\u2019")
		.replace(/&lsquo;/g, "\u2018")
		.replace(/&rdquo;/g, "\u201D")
		.replace(/&ldquo;/g, "\u201C")
		.replace(/&mdash;/g, "\u2014")
		.replace(/&ndash;/g, "\u2013")
		.replace(/&hellip;/g, "\u2026")
		.replace(/&amp;/g, "&")
		.replace(/&nbsp;/g, " ");
}

// Convert a chunk of HTML/markdown-ish text into Portable Text blocks.
// Splits paragraphs on blank lines or <br><br>, strips remaining inline tags.
function textToBlocks(text) {
	if (!text) return [];
	const normalised = decodeEntities(text)
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/p>\s*<p>/gi, "\n\n")
		.replace(/<\/?(strong|em|b|i|p)>/gi, "")
		.trim();

	const paragraphs = normalised
		.split(/\n{2,}/)
		.map((p) => p.replace(/\n/g, " ").trim())
		.filter(Boolean);

	return paragraphs.map((p, i) => ({
		_type: "block",
		_key: `b${i}`,
		style: "normal",
		markDefs: [],
		children: [{ _type: "span", _key: `s${i}`, text: p, marks: [] }],
	}));
}

function slugify(str) {
	return str
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

const failures = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Authoritative chapter order (from the old menus.en.toml). The per-file
// `weight` front matter is unreliable (some chapters have none, and
// "what-happens-next" is mis-weighted), so order by slug instead.
const CHAPTER_ORDER = {
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

// Retry transient failures (502/503/504/429 and network resets). Sanity
// dedupes assets by content hash, so retries never create duplicates.
async function withRetry(label, fn, attempts = 5) {
	let lastErr;
	for (let i = 1; i <= attempts; i++) {
		try {
			return await fn();
		} catch (err) {
			lastErr = err;
			const status = err?.statusCode || err?.response?.statusCode;
			const transient =
				[429, 500, 502, 503, 504].includes(status) ||
				err?.code === "ECONNRESET" ||
				err?.code === "ETIMEDOUT";
			if (!transient || i === attempts) throw err;
			const wait = Math.min(1000 * 2 ** (i - 1), 15000);
			console.warn(
				`    ~ ${label} failed (${status || err?.code}); retry ${i}/${attempts - 1} in ${wait}ms`,
			);
			await sleep(wait);
		}
	}
	throw lastErr;
}

async function uploadImage(absPath) {
	if (!absPath || !existsSync(absPath)) return undefined;
	const asset = await withRetry(`upload image ${basename(absPath)}`, () =>
		client.assets.upload("image", readFileSync(absPath), {
			filename: basename(absPath),
		}),
	);
	return {
		_type: "image",
		asset: { _type: "reference", _ref: asset._id },
	};
}

async function uploadFile(absPath) {
	if (!absPath || !existsSync(absPath)) return undefined;
	const asset = await withRetry(`upload file ${basename(absPath)}`, () =>
		client.assets.upload("file", readFileSync(absPath), {
			filename: basename(absPath),
		}),
	);
	return {
		_type: "file",
		asset: { _type: "reference", _ref: asset._id },
	};
}

// Find a featured.* image inside a page-bundle directory.
function findFeatured(dir, frontMatterValue) {
	if (frontMatterValue) {
		const candidate = join(dir, frontMatterValue);
		if (existsSync(candidate)) return candidate;
	}
	for (const ext of ["jpg", "jpeg", "png", "webp"]) {
		const candidate = join(dir, `featured.${ext}`);
		if (existsSync(candidate)) return candidate;
	}
	return undefined;
}

// Parse a section body: "## reflection lines" + a fenced ```story block.
function parseSectionBody(body) {
	const reflection = [];
	const headingRe = /^##\s+(.*)$/gm;
	let m;
	while ((m = headingRe.exec(body))) {
		reflection.push(decodeEntities(m[1].trim()));
	}
	const storyMatch = body.match(/```story\s*\n([\s\S]*?)```/);
	const story = storyMatch ? textToBlocks(storyMatch[1]) : [];
	return { reflection, story };
}

// --- site settings / homepage ----------------------------------------------

async function migrateSiteSettings() {
	console.log("Site settings / homepage");
	// The two homepage hero photos live in the old content root.
	const heroImages = [];
	for (const name of ["homepage-1.jpeg", "homepage-2.jpeg"]) {
		const img = await uploadImage(join(CONTENT_DIR, name));
		if (img) heroImages.push(img);
	}

	// Signature homepage prose from the old site.
	const heroText = textToBlocks(
		"Where does it sit, your power?<br>" +
			"Where do you find the will each day to face the world?<br>" +
			"Search for your power \u2014 only you know where it is.",
	);

	await withRetry("siteSettings", () =>
		client.createOrReplace({
			_id: "siteSettings",
			_type: "siteSettings",
			title: "A State of Becoming",
			description:
				"A creative exploration of change, identity and growth by Dinos Aristidou and Neil Farrelly.",
			heroHeading: "A State of Becoming",
			heroText,
			heroImages: heroImages.length ? heroImages : undefined,
			contactEmail: "hello@astateofbecoming.com",
		}),
	);
}

// --- chapters & sections ----------------------------------------------------

async function migrateChapters() {
	const chapterSlugs = readdirSync(CHAPTERS_DIR).filter((name) => {
		const full = join(CHAPTERS_DIR, name);
		if (!statSync(full).isDirectory()) return false;
		return MIGRATE_ALL || ONLY_CHAPTERS.includes(name);
	});

	for (const chapterSlug of chapterSlugs) {
		const chapterDir = join(CHAPTERS_DIR, chapterSlug);
		const indexPath = join(chapterDir, "_index.md");
		if (!existsSync(indexPath)) continue;

		const { data } = matter(readFileSync(indexPath, "utf8"));
		const chapterId = `chapter-${chapterSlug}`;
		const featured = findFeatured(chapterDir, data.featured_image);

		console.log(`Chapter: ${data.title || chapterSlug}`);
		try {
			await withRetry(`chapter ${chapterSlug}`, async () =>
				client.createOrReplace({
					_id: chapterId,
					_type: "chapter",
					title: data.title || chapterSlug,
					slug: { _type: "slug", current: chapterSlug },
					order: CHAPTER_ORDER[chapterSlug] ?? Number(data.weight) ?? 0,
					featuredImage: featured ? await uploadImage(featured) : undefined,
				}),
			);
		} catch (err) {
			failures.push(`chapter ${chapterSlug}: ${err?.message || err}`);
			console.error(`  ! Failed chapter ${chapterSlug}, continuing.`);
			continue;
		}

		// Sections (subdirectories with an _index.md).
		const sectionSlugs = readdirSync(chapterDir).filter((name) => {
			const full = join(chapterDir, name);
			return (
				statSync(full).isDirectory() && existsSync(join(full, "_index.md"))
			);
		});

		for (const sectionSlug of sectionSlugs) {
			const sectionDir = join(chapterDir, sectionSlug);
			const { data: sData, content } = matter(
				readFileSync(join(sectionDir, "_index.md"), "utf8"),
			);
			const { reflection, story } = parseSectionBody(content);
			const featuredImg = findFeatured(sectionDir, sData.featured_image);

			console.log(`  Section: ${sData.title || sectionSlug}`);
			try {
				await withRetry(`section ${sectionSlug}`, async () =>
					client.createOrReplace({
						_id: `section-${chapterSlug}-${sectionSlug}`,
						_type: "section",
						title: sData.title || sectionSlug,
						slug: { _type: "slug", current: sectionSlug },
						chapter: { _type: "reference", _ref: chapterId },
						order: Number(sData.series_order ?? sData.weight) || 0,
						featuredImage: featuredImg
							? await uploadImage(featuredImg)
							: undefined,
						reflection,
						story,
					}),
				);
			} catch (err) {
				failures.push(`section ${chapterSlug}/${sectionSlug}: ${err?.message || err}`);
				console.error(`    ! Failed section ${sectionSlug}, continuing.`);
			}
		}
	}
}

// --- gallery ----------------------------------------------------------------

// Pull key="value" pairs out of a {{< gallery-item ... >}} shortcode.
function parseShortcodeArgs(block) {
	const args = {};
	const re = /(\w+)\s*=\s*"((?:[^"\\]|\\.)*)"/g;
	let m;
	while ((m = re.exec(block))) {
		args[m[1]] = m[2];
	}
	return args;
}

async function migrateGallery() {
	const galleryFile = join(
		CHAPTERS_DIR,
		"you-know-what-you-have-to-do",
		"gallery-what-is-your-power.md",
	);
	if (!existsSync(galleryFile)) {
		console.log("No gallery file found, skipping gallery migration.");
		return;
	}

	const galleryId = "gallery-what-is-your-power";
	await withRetry("gallery doc", () =>
		client.createOrReplace({
			_id: galleryId,
			_type: "gallery",
			title: "What is your power?",
			slug: { _type: "slug", current: "what-is-your-power" },
			columns: 3,
		}),
	);

	const raw = readFileSync(galleryFile, "utf8");
	const itemRe = /{{<\s*gallery-item([\s\S]*?)>}}/g;
	let m;
	let order = 0;
	while ((m = itemRe.exec(raw))) {
		const args = parseShortcodeArgs(m[1]);
		if (!args.src) continue;

		const imgPath = join(CONTENT_DIR, args.src.replace(/^\//, ""));
		const image = await uploadImage(imgPath);
		if (!image) {
			console.warn(`  ! Missing image for ${args.title}: ${imgPath}`);
			continue;
		}

		const link = args.link || "";
		const isVideo = /\.(mp4|webm|mov)$/i.test(link);
		const isExternal = /^https?:\/\//i.test(link);

		// Optional audio file co-located in the page bundle.
		let audio;
		if (args.audio) {
			const audioPath = join(CONTENT_DIR, args.audio.replace(/^\//, ""));
			audio = await uploadFile(audioPath);
		}

		// Video: upload local files into Sanity; keep external links as URLs.
		let videoFile;
		let videoUrl;
		if (isVideo && !isExternal) {
			const videoPath = join(CONTENT_DIR, link.replace(/^\//, ""));
			videoFile = await uploadFile(videoPath);
		} else if (isVideo && isExternal) {
			videoUrl = link;
		}

		// A textLink points at a full-story page bundle (story/index.md).
		let fullStory = [];
		if (args.textLink) {
			const storyPath = join(
				CONTENT_DIR,
				args.textLink.replace(/^\//, ""),
				"index.md",
			);
			if (existsSync(storyPath)) {
				const { content } = matter(readFileSync(storyPath, "utf8"));
				fullStory = textToBlocks(content);
			}
		}

		console.log(`  Gallery item: ${args.title}`);
		try {
			await withRetry(`gallery item ${args.title}`, () =>
				client.createOrReplace({
					_id: `galleryItem-${slugify(args.title || `item-${order}`)}`,
					_type: "galleryItem",
					title: args.title || "Untitled",
					author: args.author || undefined,
					gallery: { _type: "reference", _ref: galleryId },
					order,
					image,
					description: textToBlocks(args.description),
					audio,
					videoFile,
					videoUrl,
					externalLink: link && !isVideo ? link : undefined,
					fullStory: fullStory.length ? fullStory : undefined,
					titleStyle: args.titleStyle === "wacky" ? "wacky" : "default",
				}),
			);
		} catch (err) {
			failures.push(`gallery item ${args.title}: ${err?.message || err}`);
			console.error(`  ! Failed gallery item ${args.title}, continuing.`);
		}
		order++;
	}
}

// --- run --------------------------------------------------------------------

async function main() {
	console.log(`Migrating from ${CONTENT_DIR} -> Sanity ${PROJECT_ID}/${DATASET}`);
	console.log(
		MIGRATE_ALL
			? "Scope: all chapters"
			: `Scope: ${ONLY_CHAPTERS.join(", ")}`,
	);
	await migrateSiteSettings();
	await migrateChapters();
	// The "what is your power" gallery belongs to chapter 1.
	if (MIGRATE_ALL || ONLY_CHAPTERS.includes("you-know-what-you-have-to-do")) {
		await migrateGallery();
	}

	if (failures.length) {
		console.log(`\nDone, but ${failures.length} item(s) failed:`);
		failures.forEach((f) => console.log(`  - ${f}`));
		console.log(
			"\nRe-run `npm run migrate` to retry — it is idempotent and skips duplicates.",
		);
		process.exitCode = 1;
	} else {
		console.log("\nDone. All content migrated successfully.");
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
