// Masonry layout + lightbox for the contributor galleries.
// Ported from the original Hugo shortcode, adapted to the Sanity-driven markup.

function shuffleArray<T>(array: T[]): T[] {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

function isMobile(): boolean {
	return window.innerWidth <= 768;
}

function imageHeight(img: HTMLImageElement, columnWidth: number): number {
	if (img.complete && img.naturalWidth > 0) {
		return columnWidth * (img.naturalHeight / img.naturalWidth);
	}
	return columnWidth;
}

function layoutMasonry(grid: HTMLElement): void {
	const items = Array.from(
		grid.querySelectorAll<HTMLElement>(".gallery-item"),
	);
	if (items.length === 0) return;

	const mobile = isMobile();
	const isThreeCol = grid.classList.contains("gallery-grid-cols-3");
	const columnCount = mobile ? 1 : isThreeCol ? 3 : 2;
	const gap = 10;
	const containerWidth = grid.offsetWidth;
	const columnWidth = (containerWidth - gap * (columnCount - 1)) / columnCount;
	const columnHeights = new Array(columnCount).fill(0);

	items.forEach((item) => {
		const img = item.querySelector("img");
		const itemHeight = img ? imageHeight(img, columnWidth) : columnWidth;

		if (mobile) {
			const top = columnHeights[0] + (columnHeights[0] > 0 ? gap : 0);
			item.style.left = "0px";
			item.style.top = `${top}px`;
			item.style.width = "100%";
			columnHeights[0] = top + itemHeight;
		} else {
			const shortest = columnHeights.indexOf(Math.min(...columnHeights));
			const left = shortest * (columnWidth + gap);
			const top =
				columnHeights[shortest] + (columnHeights[shortest] > 0 ? gap : 0);
			item.style.left = `${left}px`;
			item.style.top = `${top}px`;
			item.style.width = `${columnWidth}px`;
			columnHeights[shortest] = top + itemHeight;
		}
	});

	grid.style.height = `${Math.ceil(Math.max(...columnHeights))}px`;
}

/** Re-run masonry for galleries inside open panels (e.g. after a <details> expands). */
export function relayoutVisibleGalleries(): void {
	document
		.querySelectorAll<HTMLElement>(".gallery-grid-container")
		.forEach((container) => {
			const panel = container.closest("details");
			if (panel && !panel.open) return;
			const grid = container.querySelector<HTMLElement>(".gallery-grid");
			if (grid && grid.offsetWidth > 0) layoutMasonry(grid);
		});
}

const PLAY_LABEL = "Listen";
const PAUSE_LABEL = "Pause";

const prefetchedUrls = new Set<string>();

function prefetchUrl(url: string): void {
	if (!url || prefetchedUrls.has(url)) return;
	prefetchedUrls.add(url);
	const link = document.createElement("link");
	link.rel = "prefetch";
	link.as = url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) ? "video" : "image";
	link.href = url;
	document.head.appendChild(link);
}

function setLightboxImage(
	img: HTMLImageElement,
	thumb: string,
	full: string,
	alt: string,
): void {
	img.alt = alt;
	img.classList.remove("is-upgrading");

	if (!thumb && !full) {
		img.removeAttribute("src");
		return;
	}

	const target = full || thumb;
	if (!full || full === thumb) {
		img.src = target;
		return;
	}

	// Show the grid thumb immediately (usually cached), then swap to full res.
	img.src = thumb;
	img.classList.add("is-upgrading");

	const loader = new Image();
	loader.onload = () => {
		if (img.dataset.loadingFull !== full) return;
		img.src = full;
		img.classList.remove("is-upgrading");
		img.removeAttribute("data-loading-full");
	};
	loader.onerror = () => {
		if (img.dataset.loadingFull !== full) return;
		img.classList.remove("is-upgrading");
		img.removeAttribute("data-loading-full");
	};
	img.dataset.loadingFull = full;
	loader.src = full;
}

function initContainer(container: HTMLElement): void {
	if (container.dataset.galleryReady === "true") return;
	container.dataset.galleryReady = "true";

	const grid = container.querySelector<HTMLElement>(".gallery-grid");
	if (grid) {
		// Shuffle, then lay out as images load.
		const galleryItems = shuffleArray(
			Array.from(grid.querySelectorAll<HTMLElement>(".gallery-item")),
		);
		galleryItems.forEach((item) => grid.appendChild(item));

		const images = Array.from(grid.querySelectorAll("img"));
		layoutMasonry(grid);
		images.forEach((img) => {
			if (!img.complete) {
				img.addEventListener("load", () => layoutMasonry(grid), { once: true });
				img.addEventListener("error", () => layoutMasonry(grid), { once: true });
			}
		});
		Promise.all(
			images.map(
				(img) =>
					new Promise<void>((resolve) => {
						if (img.complete) return resolve();
						img.addEventListener("load", () => resolve(), { once: true });
						img.addEventListener("error", () => resolve(), { once: true });
					}),
			),
		).then(() => requestAnimationFrame(() => layoutMasonry(grid)));

		let resizeTimeout: number | undefined;
		window.addEventListener("resize", () => {
			window.clearTimeout(resizeTimeout);
			resizeTimeout = window.setTimeout(() => layoutMasonry(grid), 100);
		});
	}

	const galleryId = container.getAttribute("data-gallery-id");
	const lightbox = document.getElementById(`${galleryId}-lightbox`);
	if (!lightbox) return;

	const items = Array.from(
		container.querySelectorAll<HTMLElement>(".gallery-item"),
	);
	if (items.length === 0) return;

	const lightboxImage = lightbox.querySelector<HTMLImageElement>(
		".gallery-lightbox-image",
	)!;
	const lightboxVideo = lightbox.querySelector<HTMLVideoElement>(
		".gallery-lightbox-video",
	)!;
	const titleEl = lightbox.querySelector<HTMLElement>(".gallery-lightbox-title")!;
	const authorEl = lightbox.querySelector<HTMLElement>(
		".gallery-lightbox-author",
	)!;
	const descEl = lightbox.querySelector<HTMLElement>(
		".gallery-lightbox-description",
	)!;
	const linkEl = lightbox.querySelector<HTMLAnchorElement>(
		".gallery-lightbox-link",
	)!;
	const storyBtn = lightbox.querySelector<HTMLButtonElement>(
		".gallery-lightbox-story-btn",
	)!;
	const audioBtn = lightbox.querySelector<HTMLButtonElement>(
		".gallery-lightbox-audio-btn",
	)!;
	const audioEl = lightbox.querySelector<HTMLAudioElement>(
		".gallery-lightbox-audio",
	)!;
	const closeBtn = lightbox.querySelector(".gallery-lightbox-close");
	const prevBtn = lightbox.querySelector(".gallery-lightbox-prev");
	const nextBtn = lightbox.querySelector(".gallery-lightbox-next");
	const content = lightbox.querySelector<HTMLElement>(
		".gallery-lightbox-content",
	)!;
	const caption = lightbox.querySelector<HTMLElement>(
		".gallery-lightbox-caption",
	)!;

	let currentIndex = 0;
	let isPlaying = false;
	let storyExpanded = false;
	let videoLoadToken = 0;

	function update(): void {
		const item = items[currentIndex];
		const d = item.dataset;
		const title = d.title || "";
		const author = d.author || "";
		const description = d.description || "";
		const fullStory = d.fullStory || "";
		const link = d.link || "";
		const video = d.video || "";
		const audio = d.audio || "";
		const titleStyle = d.titleStyle || "default";

		audioEl.pause();
		audioEl.currentTime = 0;
		lightboxVideo.pause();
		isPlaying = false;
		storyExpanded = false;

		// Show an inline video player when present, otherwise the image.
		const thumb = d.thumb || "";
		const full = d.full || thumb;

		if (video) {
			const loadToken = ++videoLoadToken;
			lightboxVideo.classList.remove("is-ready");
			lightboxVideo.poster = thumb || full;
			lightboxVideo.src = video;
			lightboxVideo.style.display = "none";
			lightboxImage.style.display = "block";
			lightboxImage.src = thumb || full;
			lightboxImage.alt = title;
			lightboxImage.classList.remove("is-upgrading");
			lightboxImage.removeAttribute("data-loading-full");
			lightboxVideo.load();
			lightboxVideo.addEventListener(
				"loadeddata",
				() => {
					if (loadToken !== videoLoadToken) return;
					lightboxVideo.style.display = "block";
					lightboxImage.style.display = "none";
					lightboxVideo.classList.add("is-ready");
				},
				{ once: true },
			);
		} else {
			videoLoadToken++;
			lightboxVideo.removeAttribute("src");
			lightboxVideo.removeAttribute("poster");
			lightboxVideo.classList.remove("is-ready");
			lightboxVideo.load();
			lightboxVideo.style.display = "none";
			lightboxImage.style.display = "block";
			setLightboxImage(lightboxImage, thumb, full, title);
		}

		titleEl.textContent = title;
		titleEl.style.display = title ? "block" : "none";
		titleEl.classList.toggle("wacky", titleStyle === "wacky");

		authorEl.textContent = author;
		authorEl.style.display = author ? "block" : "none";

		descEl.innerHTML = description;
		descEl.style.display = description ? "block" : "none";

		if (link) {
			linkEl.href = link;
			const isDownload = /\.(pdf|docx?|xlsx?|zip|rar)$/i.test(link);
			const isVideo =
				/\.(mp4|webm|mov|avi|mkv)$/i.test(link) ||
				/youtube\.com|youtu\.be|vimeo\.com/i.test(link);
			if (isDownload) {
				linkEl.textContent = "Download";
				linkEl.setAttribute("download", "");
			} else if (isVideo) {
				linkEl.textContent = "Watch video";
				linkEl.removeAttribute("download");
			} else {
				linkEl.textContent = "Learn more";
				linkEl.removeAttribute("download");
			}
			linkEl.style.display = "inline-flex";
		} else {
			linkEl.style.display = "none";
		}

		storyBtn.style.display = fullStory ? "inline-flex" : "none";
		storyBtn.textContent = "Read full text";

		if (audio) {
			audioEl.src = audio;
			audioBtn.textContent = PLAY_LABEL;
			audioBtn.style.display = "inline-flex";
		} else {
			audioBtn.style.display = "none";
		}

		const count = [
			title,
			author,
			description,
			link,
			audio,
			fullStory,
		].filter(Boolean).length;
		caption.classList.remove("hidden", "minimal", "normal", "full");
		content.classList.remove("no-caption", "minimal-caption", "full-caption");
		if (count === 0) {
			caption.classList.add("hidden");
			content.classList.add("no-caption");
		} else if (count <= 2 && !description && !fullStory) {
			caption.classList.add("minimal");
			content.classList.add("minimal-caption");
		} else {
			caption.classList.add("full");
			content.classList.add("full-caption");
		}
	}

	function open(index: number): void {
		currentIndex = index;
		update();
		lightbox!.classList.add("active");
		document.body.classList.add("gallery-lightbox-open");
	}

	function close(): void {
		lightbox!.classList.remove("active");
		document.body.classList.remove("gallery-lightbox-open");
		audioEl.pause();
		audioEl.currentTime = 0;
		lightboxVideo.pause();
		isPlaying = false;
	}

	function showPrev(): void {
		currentIndex = (currentIndex - 1 + items.length) % items.length;
		update();
	}
	function showNext(): void {
		currentIndex = (currentIndex + 1) % items.length;
		update();
	}

	items.forEach((item, index) => {
		item.addEventListener("click", () => open(index));
		item.addEventListener(
			"mouseenter",
			() => {
				const d = item.dataset;
				prefetchUrl(d.full || d.thumb || "");
				if (d.video) prefetchUrl(d.video);
			},
			{ once: true },
		);
	});
	closeBtn?.addEventListener("click", (e) => {
		e.stopPropagation();
		close();
	});
	prevBtn?.addEventListener("click", (e) => {
		e.stopPropagation();
		close();
	});
	nextBtn?.addEventListener("click", (e) => {
		e.stopPropagation();
		close();
	});

	storyBtn.addEventListener("click", (e) => {
		e.stopPropagation();
		const fullStory = items[currentIndex].dataset.fullStory || "";
		storyExpanded = !storyExpanded;
		if (storyExpanded) {
			descEl.innerHTML = fullStory;
			descEl.style.display = "block";
			storyBtn.textContent = "Show less";
		} else {
			descEl.innerHTML = items[currentIndex].dataset.description || "";
			storyBtn.textContent = "Read full text";
		}
	});

	audioBtn.addEventListener("click", (e) => {
		e.stopPropagation();
		if (isPlaying) {
			audioEl.pause();
			audioBtn.textContent = PLAY_LABEL;
			isPlaying = false;
		} else {
			void audioEl.play();
			audioBtn.textContent = PAUSE_LABEL;
			isPlaying = true;
		}
	});
	audioEl.addEventListener("ended", () => {
		audioBtn.textContent = PLAY_LABEL;
		isPlaying = false;
	});

	lightbox.addEventListener("click", (e) => {
		if (e.target === lightbox) close();
	});
	document.addEventListener("keydown", (e) => {
		if (!lightbox!.classList.contains("active")) return;
		if (e.key === "Escape") close();
		else if (e.key === "ArrowLeft") showPrev();
		else if (e.key === "ArrowRight") showNext();
	});
}

export function initGalleries(): void {
	document
		.querySelectorAll<HTMLElement>(".gallery-grid-container")
		.forEach((container) => initContainer(container));
}
