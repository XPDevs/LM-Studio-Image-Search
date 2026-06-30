import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import sharp from "sharp";

interface ImageResult {
  image: string;
  title: string;
  url: string;
  thumbnail: string;
}

async function getVqd(query: string): Promise<string> {
  const res = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  const html = await res.text();
  const m = html.match(/vqd=([\d-]+)/);
  if (!m) throw new Error("Could not get search token");
  return m[1];
}

async function searchImages(query: string, max: number, site?: string): Promise<ImageResult[]> {
  const q = site ? `site:${site} ${query}` : query;
  const vqd = await getVqd(q);
  const url = `https://duckduckgo.com/i.js?q=${encodeURIComponent(q)}&o=json&p=1&vqd=${vqd}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const data = (await res.json()) as { results: ImageResult[] };
  return (data.results || []).slice(0, max);
}

async function getImage(url: string, w?: number, h?: number): Promise<{ data: string; mimeType: string }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Referer: "https://duckduckgo.com/",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = Buffer.from(await res.arrayBuffer());
  const dw = w || 800;
  const dh = h || 800;
  const out = await sharp(raw).resize(dw, dh, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
  return { data: Buffer.from(out).toString("base64"), mimeType: "image/jpeg" };
}

const server = new McpServer({ name: "XPDevs Image Search", version: "1.0.0" });

server.tool(
  "search_images",
  {
    query: z.string().describe("What to search for"),
    count: z.number().int().min(1).max(10).default(1).describe("Number of images (1-10)"),
    site: z.string().optional().describe("Restrict to a domain"),
    width: z.number().int().min(32).optional().describe("Output width"),
    height: z.number().int().min(32).optional().describe("Output height"),
  },
  async ({ query, count, site, width, height }) => {
    try {
      const images = await searchImages(query, count, site);
      if (images.length === 0) {
        return { content: [{ type: "text" as const, text: "No results found" }] };
      }
      const content: ({ type: "text"; text: string } | { type: "image"; data: string; mimeType: string })[] = [];
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (images.length > 1) content.push({ type: "text", text: `**Image ${i + 1}**` });
        try {
          const imgData = await getImage(img.image, width, height);
          content.push({ type: "image", data: imgData.data, mimeType: imgData.mimeType });
          const domain = new URL(img.url).hostname.replace(/^www\./, "");
          const label = img.title ? `"${img.title}" - ` : "";
          content.push({ type: "text", text: `${label}[${domain}](${img.url})` });
        } catch {
          content.push({ type: "text", text: `Could not load image ${i + 1}` });
        }
      }
      return { content };
    } catch (e) {
      return { content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : e}` }] };
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(e => { process.stderr.write(String(e) + "\n"); process.exit(1); });
