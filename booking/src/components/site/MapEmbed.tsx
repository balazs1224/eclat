"use client";
import { useState } from "react";

// Balatonboglár — település szintű térképnézet. A pontos cím megadásáig nem jelölünk konkrét helyet.
const BBOX = "17.615,46.758,17.690,46.795";
const OSM_LINK = "https://www.openstreetmap.org/#map=14/46.776/17.652";

export function MapEmbed({ loadLabel, notice, openLabel }: { loadLabel: string; notice: string; openLabel: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-lake-mist md:aspect-[5/4]">
      {loaded ? (
        <iframe
          title="Balatonboglár térképe"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${BBOX}&layer=mapnik`}
          className="h-full w-full border-0 grayscale-[35%] sepia-[12%]"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-5 p-8 text-center">
          <svg aria-hidden viewBox="0 0 120 60" className="w-48 text-lake/60">
            <path d="M5 35 C 25 15, 45 45, 65 28 S 100 20, 115 30" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle cx="64" cy="30" r="2.5" fill="#a8875a" />
          </svg>
          <p className="max-w-sm text-xs text-muted">{notice}</p>
          <button type="button" onClick={() => setLoaded(true)} className="btn btn-ghost">{loadLabel}</button>
        </div>
      )}
      <a href={OSM_LINK} target="_blank" rel="noopener noreferrer" className="placeholder-tag absolute right-3 bottom-3 link-underline">
        {openLabel} ↗
      </a>
    </div>
  );
}
