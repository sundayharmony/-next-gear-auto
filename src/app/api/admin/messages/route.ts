/**
 * Compatibility entry for older clients or tooling that calls `GET /api/admin/messages`.
 * Canonical list endpoint remains `GET /api/admin/messages/threads`.
 */
export { GET } from "./threads/route";
