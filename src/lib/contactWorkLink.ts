const ZIP_IN_URL = /\.zip(?:\?|#|$|\/)/i;

function isAllowedHost(hostname: string): boolean {
	const host = hostname.toLowerCase();
	if (host === "drive.google.com" || host === "docs.google.com") return true;
	if (host === "dropbox.com" || host.endsWith(".dropbox.com")) return true;
	if (host === "dropboxusercontent.com" || host.endsWith(".dropboxusercontent.com")) {
		return true;
	}
	return false;
}

export type WorkLinkValidation =
	| { valid: true }
	| { valid: false; message: string };

export function validateWorkLink(link: string): WorkLinkValidation {
	const trimmed = link.trim();
	if (!trimmed) return { valid: true };

	let url: URL;
	try {
		url = new URL(trimmed);
	} catch {
		return { valid: false, message: "Please enter a valid URL." };
	}

	if (url.protocol !== "https:") {
		return { valid: false, message: "Work links must use HTTPS." };
	}

	if (!isAllowedHost(url.hostname)) {
		return {
			valid: false,
			message: "Work links must be shared via Google Drive or Dropbox only.",
		};
	}

	if (ZIP_IN_URL.test(url.pathname) || ZIP_IN_URL.test(url.search)) {
		return {
			valid: false,
			message:
				"Zip files are not accepted for safety reasons. Please share your work on Drive or Dropbox without using zip archives.",
		};
	}

	return { valid: true };
}
