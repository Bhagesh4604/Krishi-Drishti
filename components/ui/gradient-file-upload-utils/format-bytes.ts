// format-bytes.ts - formats byte sizes into human-readable strings
export interface FormatBytesOptions {
  decimals?: number;
  sizeType?: "accurate" | "normal";
}

export function formatBytes(bytes: number, opts: FormatBytesOptions = {}): string {
  const { decimals = 2, sizeType = "normal" } = opts;
  if (bytes === 0) return "0 B";
  const k = sizeType === "accurate" ? 1024 : 1000;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = sizeType === "accurate"
    ? ["B", "KiB", "MiB", "GiB", "TiB"]
    : ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function parseBytes(str: string): number {
  const match = str.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB|KiB|MiB|GiB|TiB)$/i);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  const map: Record<string, number> = {
    B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12,
    KIB: 1024, MIB: 1048576, GIB: 1073741824, TIB: 1099511627776,
  };
  return val * (map[unit] ?? 1);
}
