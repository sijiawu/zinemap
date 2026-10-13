/**
 * Collapse a multi-line locale_edits.edit_summary into a brief field list
 * (e.g. "name, end time, poster") for page history.
 */
export function summarizeEditSummary(editSummary: string | null | undefined): string {
  if (!editSummary?.trim()) return ""

  const lines = editSummary
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  const fields: string[] = []
  const seen = new Set<string>()

  const addField = (raw: string) => {
    const label = raw.trim().toLowerCase()
    if (!label || seen.has(label)) return
    seen.add(label)
    fields.push(label)
  }

  for (const line of lines) {
    const newMatch = /^new\s+(.+?)\s*:/i.exec(line)
    if (newMatch) {
      addField(newMatch[1])
      continue
    }

    if (/^\+tags\s*:/i.test(line) || /^-tags\s*:/i.test(line)) {
      addField("tags")
      continue
    }

    if (/add\/update\s+poster/i.test(line) || /remove\s+poster/i.test(line)) {
      addField("poster")
      continue
    }
  }

  if (fields.length > 0) {
    return fields.join(", ")
  }

  const fallback = lines[0] || ""
  return fallback.length > 80 ? `${fallback.slice(0, 77)}...` : fallback
}
