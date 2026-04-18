// Pattern 33: Reduce-Accumulate
// Shape: Iterate -> accumulate into single value

// === Types ===

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface Vote {
  candidateId: string;
  voterId: string;
  weight: number;
}

interface TimeEntry {
  projectId: string;
  hours: number;
  date: string;
  billable: boolean;
}

interface VoteCount {
  [candidateId: string]: number;
}

interface ProjectHours {
  [projectId: string]: number;
}

// === Variant A: Sum cart total ===

function calculateCartTotal(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}

function calculateItemCount(items: CartItem[]): number {
  return items.reduce((count, item) => count + item.quantity, 0);
}

function calculateAveragePrice(items: CartItem[]): number {
  if (items.length === 0) return 0;
  const total = items.reduce((sum, item) => sum + item.price, 0);
  return total / items.length;
}

// === Variant B: Count votes per candidate ===

function countVotes(votes: Vote[]): VoteCount {
  return votes.reduce<VoteCount>((counts, vote) => {
    const currentCount = counts[vote.candidateId] ?? 0;
    return {
      ...counts,
      [vote.candidateId]: currentCount + vote.weight,
    };
  }, {});
}

function countUniqueVoters(votes: Vote[]): number {
  return votes.reduce<Set<string>>((voters, vote) => {
    voters.add(vote.voterId);
    return voters;
  }, new Set()).size;
}

// === Variant C: Aggregate project hours ===

function sumHoursByProject(entries: TimeEntry[]): ProjectHours {
  return entries.reduce<ProjectHours>((totals, entry) => {
    const currentHours = totals[entry.projectId] ?? 0;
    return {
      ...totals,
      [entry.projectId]: currentHours + entry.hours,
    };
  }, {});
}

function sumBillableHours(entries: TimeEntry[]): number {
  return entries.reduce((total, entry) => {
    return entry.billable ? total + entry.hours : total;
  }, 0);
}

function findEarliestDate(entries: TimeEntry[]): string | null {
  if (entries.length === 0) return null;
  return entries.reduce((earliest, entry) => {
    return entry.date < earliest ? entry.date : earliest;
  }, entries[0].date);
}

// === Exports ===

export {
  calculateCartTotal,
  calculateItemCount,
  calculateAveragePrice,
  countVotes,
  countUniqueVoters,
  sumHoursByProject,
  sumBillableHours,
  findEarliestDate,
};

export type { CartItem, Vote, TimeEntry, VoteCount, ProjectHours };
