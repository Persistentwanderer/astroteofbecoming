import type { APIRoute } from "astro";
import { createClient } from "@sanity/client";
import { resolveSanityEnv } from "../../../sanity.project.mjs";
import { validateWorkLink } from "../../lib/contactWorkLink";

export const prerender = false;

function writeClient() {
	const token =
		import.meta.env.SANITY_API_WRITE_TOKEN?.trim() ||
		process.env.SANITY_API_WRITE_TOKEN?.trim();

	if (!token) {
		throw new Error("SANITY_API_WRITE_TOKEN is not configured");
	}

	const { projectId, dataset } = resolveSanityEnv(import.meta.env);

	return createClient({
		projectId,
		dataset,
		apiVersion: "2024-12-01",
		token,
		useCdn: false,
	});
}

export const POST: APIRoute = async ({ request }) => {
	let data: FormData;
	try {
		data = await request.formData();
	} catch {
		return new Response(JSON.stringify({ message: "Invalid form data" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	const name = String(data.get("name") ?? "").trim();
	const email = String(data.get("email") ?? "").trim();
	const chapter = String(data.get("chapter") ?? "").trim();
	const workTitle = String(data.get("workTitle") ?? "").trim();
	const message = String(data.get("message") ?? "").trim();
	const link = String(data.get("link") ?? "").trim();

	if (!name || !email || !workTitle || !message) {
		return new Response(JSON.stringify({ message: "Missing required fields" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return new Response(JSON.stringify({ message: "Invalid email address" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	const linkCheck = validateWorkLink(link);
	if (!linkCheck.valid) {
		return new Response(JSON.stringify({ message: linkCheck.message }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		const client = writeClient();
		await client.create({
			_type: "contactSubmission",
			name,
			email,
			chapter: chapter || undefined,
			workTitle,
			message,
			link: link || undefined,
			submittedAt: new Date().toISOString(),
		});
	} catch (err) {
		console.error("Contact submission failed:", err);
		return new Response(
			JSON.stringify({ message: "Unable to save your message. Please try again later." }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}

	return new Response(JSON.stringify({ message: "Thank you — your message has been sent." }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
};
