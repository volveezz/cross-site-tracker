import { Hono } from "hono";
import { handle } from "hono/vercel";

export const config = {
	runtime: "edge",
};

const app = new Hono();

app.get("/", (c) => c.text("Hello from Vercel!"));
app.get("*", (c) => c.text("Catch all route"));

const handler = handle(app);

export const GET = handler;
export const POST = handler;
export default handler;
