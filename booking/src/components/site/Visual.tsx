import type { MediaItem } from "@/lib/public-data";

const TONES = {
  lake: "radial-gradient(120% 80% at 70% 20%, #f3efe6 0%, #dfe5e3 38%, #b9c7c8 70%, #8fa4a8 100%)",
  dusk: "radial-gradient(110% 90% at 30% 25%, #f6efe3 0%, #e8d9c2 40%, #c9b391 75%, #a68a63 100%)",
  reed: "linear-gradient(165deg, #efe7da 0%, #dcd3bf 45%, #b8b293 100%)",
  stone: "linear-gradient(200deg, #f2ece2 0%, #e2d5c1 55%, #c8b9a3 100%)",
} as const;

export type Tone = keyof typeof TONES;

/** Fotó, ha van feltöltve; különben visszafogott, egyértelműen jelölt helykitöltő kompozíció. */
export function Visual({
  media,
  label,
  tone = "lake",
  className = "",
  sizes = "100vw",
  priority = false,
  tagClassName = "bottom-3 left-3",
}: {
  media?: MediaItem | null;
  label: string;
  tone?: Tone;
  className?: string;
  sizes?: string;
  priority?: boolean;
  tagClassName?: string;
}) {
  if (media) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/media/${media.id}`}
        srcSet={`/media/${media.id}?size=thumb 800w, /media/${media.id} ${media.width}w`}
        sizes={sizes}
        width={media.width}
        height={media.height}
        alt={media.alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }
  return (
    <div role="img" aria-label={`Helykitöltő kép: ${label}`} className={`relative h-full w-full overflow-hidden ${className}`} style={{ background: TONES[tone] }}>
      <svg aria-hidden className="absolute inset-0 h-full w-full opacity-[0.22]" preserveAspectRatio="none" viewBox="0 0 100 100">
        <path d="M0 68 C 20 64, 35 70, 52 66 S 82 61, 100 64" stroke="#fff" strokeWidth="0.25" fill="none" />
        <path d="M0 74 C 18 71, 40 77, 60 73 S 85 70, 100 72" stroke="#fff" strokeWidth="0.2" fill="none" />
        <path d="M0 80 C 25 78, 45 83, 66 80 S 90 78, 100 79" stroke="#fff" strokeWidth="0.15" fill="none" />
      </svg>
      <span className={`placeholder-tag absolute ${tagClassName}`}>[PLACEHOLDER: {label}]</span>
    </div>
  );
}
