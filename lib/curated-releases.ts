// Manually curated streaming releases from official announcements
// Update this periodically with confirmed releases

export interface CuratedRelease {
  title: string;
  year: string;
  service: string;
  date: string; // YYYY-MM-DD
}

export const curatedReleases: CuratedRelease[] = [
  // Add confirmed releases here as they're announced
  // Example format:
  // { title: 'Movie Name', year: '2025', service: 'Netflix', date: '2025-03-15' },
];

export function findCuratedRelease(title: string, year: string): CuratedRelease | null {
  const normalized = title.toLowerCase().trim();
  const release = curatedReleases.find(r => 
    r.title.toLowerCase() === normalized && r.year === year
  );
  return release || null;
}
