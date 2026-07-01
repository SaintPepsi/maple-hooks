/** The configured watch list from a hook's config, or [] when unset. Pure.
 *  settings.json is the single source of truth — there is no in-code default. */
export function resolveWatched(config: { readonly files?: readonly string[] }): readonly string[] {
  return config.files ?? [];
}
