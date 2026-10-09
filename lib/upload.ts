export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Échec de l'upload.");
  return data.url as string;
}

export function familyNameFromFile(file: File): string {
  const base = file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9]/g, "");
  return `Custom${base || "Font"}${Math.random().toString(36).slice(2, 6)}`;
}
