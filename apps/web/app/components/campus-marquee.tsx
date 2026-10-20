interface CampusMarqueeProps {
  campuses: string[];
}

/** The campuses the studio shoots at, as a quiet row under the hero. Nothing when there are none. */
export default function CampusMarquee({ campuses }: CampusMarqueeProps) {
  if (campuses.length === 0) return null;

  return (
    <div className="border-y border-white/10 bg-card px-4 py-4">
      <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs font-medium uppercase tracking-wider text-fg/80">
        {campuses.map((name) => (
          <li key={name} className="flex items-center gap-8">
            <span>{name}</span>
            <span aria-hidden className="text-white/20 last:hidden">
              /
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
