export function extractJsonFromHtml(html) {
  const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  let raw = preMatch ? preMatch[1] : html;

  raw = raw.replace(/<[^>]+>/g, "").trim();

  raw = raw
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Could not find full JSON object in HTML");
  }

  return raw.slice(start, end + 1);
}
