import { auth } from "@segmentation/auth";

export async function requireRouteSession(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return null;
  }

  return session;
}

export async function requireRouteUser(request: Request) {
  const session = await requireRouteSession(request);

  if (!session?.user) {
    return null;
  }

  return {
    session,
    userId: session.user.id,
  };
}
