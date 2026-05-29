/** Public Sanity identifiers — safe to commit (included in every client request). */
export const SANITY_PROJECT_ID = "s3iiyuuu";
export const SANITY_DATASET = "production";

/** Ignore blank values that Cloudflare Builds may inject as empty strings. */
export function resolveSanityEnv(env = {}) {
	const projectId = env.PUBLIC_SANITY_PROJECT_ID?.trim();
	const dataset = env.PUBLIC_SANITY_DATASET?.trim();
	return {
		projectId: projectId || SANITY_PROJECT_ID,
		dataset: dataset || SANITY_DATASET,
	};
}
