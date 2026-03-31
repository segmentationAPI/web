import GoogleSignInButton from "./google-sign-in-button";

export default function AuthForm({
  authError,
  callbackURL,
}: {
  authError?: string;
  callbackURL: string;
}) {
  return (
    <div className="mx-auto mt-10 w-full max-w-md space-y-6 p-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Sign in</h1>
        <p className="text-muted-foreground text-sm">
          Continue with Google to access the dashboard.
        </p>
        {authError ? (
          <p className="text-sm text-red-500">Authentication error: {authError}</p>
        ) : null}
      </div>

      <GoogleSignInButton callbackURL={callbackURL} />
    </div>
  );
}
