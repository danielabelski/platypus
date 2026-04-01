export function buildResourceUrl(
  frontendUrl: string | undefined,
  orgId: string,
  workspaceId: string,
  resourcePath: string,
): string | undefined {
  if (!frontendUrl) return undefined;
  const base = frontendUrl.replace(/\/+$/, "");
  return `${base}/${orgId}/workspace/${workspaceId}/${resourcePath}`;
}
