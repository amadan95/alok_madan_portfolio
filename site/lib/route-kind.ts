export type RouteKind =
  | "home"
  | "list"
  | "archive"
  | "raw"
  | "contact"
  | "disclaimer"
  | "project";

export function getRouteKind(pathname: string): RouteKind {
  if (pathname === "/") {
    return "home";
  }
  if (pathname === "/list") {
    return "list";
  }
  if (pathname === "/archive") {
    return "archive";
  }
  if (pathname === "/raw") {
    return "raw";
  }
  if (pathname === "/contact") {
    return "contact";
  }
  if (pathname === "/disclaimer") {
    return "disclaimer";
  }
  return "project";
}
