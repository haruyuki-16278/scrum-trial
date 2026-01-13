import { Hono } from "hono";
import { serveStatic } from "hono/deno"; 
import { cors } from "hono/cors";
import APIルーター from "./controllers/APIコントローラ.ts";

const アプリ = new Hono();

アプリ.use("/*", cors());

アプリ.route("/api", APIルーター);

アプリ.use("/*", serveStatic({ root: "./frontend/dist" }));
アプリ.get("/*", serveStatic({ path: "./frontend/dist/index.html" }));

export default アプリ;
