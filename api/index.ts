import { handle } from "hono/vercel";
import appA from "../src/serverA";
import appX from "../src/serverX";

const mode = process.env.SERVER_MODE || "a";
const app = mode === "x" ? appX : appA;
const handler = handle(app);

export const GET = handler;
export const POST = handler;
export default handler;
