import { handle } from "hono/vercel";
import appA from "../src/serverA";
import appX from "../src/serverX";

const mode = process.env.SERVER_MODE || "a";
const app = mode === "x" ? appX : appA;

export const GET = handle(app);
export const POST = handle(app);
export default handle(app);
