// Pattern 32: Filter-Predicate
// Shape: Iterate collection -> keep items matching predicate

// === Types ===

interface Product {
  id: string;
  name: string;
  price: number;
  inStock: boolean;
  category: string;
}

interface Transaction {
  id: string;
  amount: number;
  type: 'credit' | 'debit';
  status: 'pending' | 'completed' | 'failed';
  date: Date;
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  assignee: string | null;
}

// === Variant A: Filter in-stock products ===

function isInStock(product: Product): boolean {
  return product.inStock;
}

function filterAvailableProducts(products: Product[]): Product[] {
  return products.filter((product) => isInStock(product));
}

function filterByCategory(products: Product[], category: string): Product[] {
  return products.filter((product) => product.category === category);
}

function filterAffordableProducts(products: Product[], maxPrice: number): Product[] {
  return products.filter((product) => product.price <= maxPrice);
}

// === Variant B: Filter completed transactions ===

function isCompleted(transaction: Transaction): boolean {
  return transaction.status === 'completed';
}

function filterCompletedTransactions(transactions: Transaction[]): Transaction[] {
  return transactions.filter((transaction) => isCompleted(transaction));
}

function filterCredits(transactions: Transaction[]): Transaction[] {
  return transactions.filter((transaction) => transaction.type === 'credit');
}

function filterTransactionsAfterDate(transactions: Transaction[], after: Date): Transaction[] {
  return transactions.filter((transaction) => transaction.date > after);
}

// === Variant C: Filter pending tasks ===

function isPending(task: Task): boolean {
  return !task.completed;
}

function filterPendingTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => isPending(task));
}

function filterHighPriorityTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => task.priority === 'high');
}

function filterUnassignedTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => task.assignee === null);
}

// === Exports ===

export {
  filterAvailableProducts,
  filterByCategory,
  filterAffordableProducts,
  filterCompletedTransactions,
  filterCredits,
  filterTransactionsAfterDate,
  filterPendingTasks,
  filterHighPriorityTasks,
  filterUnassignedTasks,
  isInStock,
  isCompleted,
  isPending,
};

export type { Product, Transaction, Task };
