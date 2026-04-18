// Pattern 2: Null-Check-Chain
// These functions are structurally identical — same AST shape, different identifiers
// Shape: Check multiple conditions in sequence, return on first failure

// ============================================================================
// Placeholder types for compilation
// ============================================================================

interface UserProfile {
  settings?: {
    preferences?: {
      theme?: string;
    };
  };
}

interface CompanyData {
  departments?: {
    engineering?: {
      headcount?: number;
    };
  };
}

interface ApiResponse {
  data?: {
    results?: {
      items?: string[];
    };
  };
}

// ============================================================================
// VARIANT A: Extract user theme preference
// ============================================================================

function extractUserTheme(profile: UserProfile | null): string | null {
  if (!profile) return null;
  if (!profile.settings) return null;
  if (!profile.settings.preferences) return null;
  return profile.settings.preferences.theme ?? null;
}

// ============================================================================
// VARIANT B: Extract engineering headcount
// ============================================================================

function extractHeadcount(company: CompanyData | null): number | null {
  if (!company) return null;
  if (!company.departments) return null;
  if (!company.departments.engineering) return null;
  return company.departments.engineering.headcount ?? null;
}

// ============================================================================
// VARIANT C: Extract API result items
// ============================================================================

function extractItems(response: ApiResponse | null): string[] | null {
  if (!response) return null;
  if (!response.data) return null;
  if (!response.data.results) return null;
  return response.data.results.items ?? null;
}

// ============================================================================
// Export for testing
// ============================================================================

export {
  extractUserTheme,
  extractHeadcount,
  extractItems,
  UserProfile,
  CompanyData,
  ApiResponse,
};
