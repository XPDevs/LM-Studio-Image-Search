# XPDevs Image Search

An MCP server that lets LM Studio search the web for images and show them in chat.

## What it does

- Searches DuckDuckGo for images (no API key needed)
- Downloads and resizes images
- Returns them inline in the LM Studio chat

## How to use it

Open LM Studio, go to the Program tab (right sidebar), click Install > Edit mcp.json, and add:

```json
{
  "mcpServers": {
    "XPDevs/image-search": {
      "command": "node",
      "args": ["/full/path/to/image-search-mcp/dist/index.js"]
    }
  }
}
```

Replace `/full/path/to/` with the actual path to the folder.

Save the file. LM Studio will load the server automatically. Start a new chat and you will see `search_images` appear in the tools list.

## Tool parameters

| Parameter | What it does |
|-----------|-------------|
| `query` | What to search for. Keep it descriptive. |
| `count` | How many images to return (1-10, default 1). |
| `site` | Optional. Restrict to one domain (eg "reddit.com", "unsplash.com"). |
| `width` | Optional. Output width in pixels. Default 800. |
| `height` | Optional. Output height in pixels. Default 800. |

## System requirements

- Node.js (LM Studio bundles this, no separate install needed)
- The folder must stay in place while LM Studio is running

## Build from source

```bash
cd image-search-mcp
npm install
npm run build
```

Do this after pulling updates or making changes to the source.
