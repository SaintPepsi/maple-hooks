// Pattern 36: Sort-Compare
// Shape: Sort collection by comparison function

// === Types ===

interface Article {
  id: string;
  title: string;
  publishedAt: Date;
  viewCount: number;
  author: string;
}

interface Player {
  id: string;
  name: string;
  score: number;
  gamesPlayed: number;
  rank: number;
}

interface File {
  name: string;
  size: number;
  modifiedAt: Date;
  type: string;
}

// === Variant A: Sort articles by date ===

function sortArticlesByDate(articles: Article[], ascending = true): Article[] {
  return [...articles].sort((a, b) => {
    const timeA = a.publishedAt.getTime();
    const timeB = b.publishedAt.getTime();
    if (timeA < timeB) return ascending ? -1 : 1;
    if (timeA > timeB) return ascending ? 1 : -1;
    return 0;
  });
}

function sortArticlesByViews(articles: Article[]): Article[] {
  return [...articles].sort((a, b) => {
    if (a.viewCount < b.viewCount) return 1;
    if (a.viewCount > b.viewCount) return -1;
    return 0;
  });
}

function sortArticlesByTitle(articles: Article[]): Article[] {
  return [...articles].sort((a, b) => {
    if (a.title < b.title) return -1;
    if (a.title > b.title) return 1;
    return 0;
  });
}

// === Variant B: Sort players by score ===

function sortPlayersByScore(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    if (a.score < b.score) return 1;
    if (a.score > b.score) return -1;
    return 0;
  });
}

function sortPlayersByRank(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    if (a.rank < b.rank) return -1;
    if (a.rank > b.rank) return 1;
    return 0;
  });
}

function sortPlayersByName(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });
}

// === Variant C: Sort files by size and date ===

function sortFilesBySize(files: File[], ascending = true): File[] {
  return [...files].sort((a, b) => {
    if (a.size < b.size) return ascending ? -1 : 1;
    if (a.size > b.size) return ascending ? 1 : -1;
    return 0;
  });
}

function sortFilesByModifiedDate(files: File[]): File[] {
  return [...files].sort((a, b) => {
    const timeA = a.modifiedAt.getTime();
    const timeB = b.modifiedAt.getTime();
    if (timeA < timeB) return 1;
    if (timeA > timeB) return -1;
    return 0;
  });
}

function sortFilesByName(files: File[]): File[] {
  return [...files].sort((a, b) => {
    const nameA = a.name.toLowerCase();
    const nameB = b.name.toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });
}

// === Generic sortBy utility ===

function sortBy<T, K extends string | number | Date>(
  items: T[],
  keyFn: (item: T) => K,
  ascending = true
): T[] {
  return [...items].sort((a, b) => {
    const keyA = keyFn(a);
    const keyB = keyFn(b);
    if (keyA < keyB) return ascending ? -1 : 1;
    if (keyA > keyB) return ascending ? 1 : -1;
    return 0;
  });
}

// === Exports ===

export {
  sortArticlesByDate,
  sortArticlesByViews,
  sortArticlesByTitle,
  sortPlayersByScore,
  sortPlayersByRank,
  sortPlayersByName,
  sortFilesBySize,
  sortFilesByModifiedDate,
  sortFilesByName,
  sortBy,
};

export type { Article, Player, File };
