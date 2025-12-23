import serverA from "./serverA";
import serverX from "./serverX";

const mode = process.env.SERVER_MODE || "a";

export default mode === "x" ? serverX : serverA;
