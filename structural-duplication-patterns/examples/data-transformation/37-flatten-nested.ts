// Pattern 37: Flatten-Nested
// Shape: Flatten nested collection into single level

// === Types ===

interface Category {
  id: string;
  name: string;
  products: Product[];
}

interface Product {
  id: string;
  name: string;
  price: number;
}

interface Department {
  id: string;
  name: string;
  teams: Team[];
}

interface Team {
  id: string;
  name: string;
  members: string[];
}

interface Folder {
  name: string;
  files: string[];
  subfolders: Folder[];
}

// === Variant A: Flatten products from categories ===

function flattenProductsFromCategories(categories: Category[]): Product[] {
  const result: Product[] = [];
  for (const category of categories) {
    for (const product of category.products) {
      result.push(product);
    }
  }
  return result;
}

function flattenProductIds(categories: Category[]): string[] {
  const result: string[] = [];
  for (const category of categories) {
    for (const product of category.products) {
      result.push(product.id);
    }
  }
  return result;
}

// === Variant B: Flatten members from departments/teams ===

function flattenTeamsFromDepartments(departments: Department[]): Team[] {
  const result: Team[] = [];
  for (const department of departments) {
    for (const team of department.teams) {
      result.push(team);
    }
  }
  return result;
}

function flattenMembersFromDepartments(departments: Department[]): string[] {
  const result: string[] = [];
  for (const department of departments) {
    for (const team of department.teams) {
      for (const member of team.members) {
        result.push(member);
      }
    }
  }
  return result;
}

// === Variant C: Flatten files from folders (recursive) ===

function flattenFilesFromFolder(folder: Folder): string[] {
  const result: string[] = [];

  for (const file of folder.files) {
    result.push(file);
  }

  for (const subfolder of folder.subfolders) {
    const subFiles = flattenFilesFromFolder(subfolder);
    for (const file of subFiles) {
      result.push(file);
    }
  }

  return result;
}

function flattenAllFolders(folder: Folder): string[] {
  const result: string[] = [folder.name];

  for (const subfolder of folder.subfolders) {
    const subFolders = flattenAllFolders(subfolder);
    for (const name of subFolders) {
      result.push(name);
    }
  }

  return result;
}

// === Using flatMap alternative ===

function flattenProductsUsingFlatMap(categories: Category[]): Product[] {
  return categories.flatMap((category) => category.products);
}

function flattenTeamsUsingFlatMap(departments: Department[]): Team[] {
  return departments.flatMap((department) => department.teams);
}

function flattenMembersUsingFlatMap(departments: Department[]): string[] {
  return departments.flatMap((department) =>
    department.teams.flatMap((team) => team.members)
  );
}

// === Exports ===

export {
  flattenProductsFromCategories,
  flattenProductIds,
  flattenTeamsFromDepartments,
  flattenMembersFromDepartments,
  flattenFilesFromFolder,
  flattenAllFolders,
  flattenProductsUsingFlatMap,
  flattenTeamsUsingFlatMap,
  flattenMembersUsingFlatMap,
};

export type { Category, Product, Department, Team, Folder };
