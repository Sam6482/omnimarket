import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireSession, signIn } from "@/server/auth";
import { OAUTH_PROVIDERS, isOAuthProvider, loginErrorMessage, safeCallbackUrl } from "@/lib/auth-redirect";

export const metadata: Metadata = { title: "Iniciar sesión | OmniMarket" };
export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);

  if (await requireSession()) redirect(callbackUrl);

  const errorMessage = loginErrorMessage(params.error);

  async function signInWith(formData: FormData) {
    "use server";
    const provider = formData.get("provider");
    if (!isOAuthProvider(provider)) return;
    await signIn(provider, { redirectTo: safeCallbackUrl(formData.get("callbackUrl")) });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <section
        className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm"
        aria-labelledby="login-title"
      >
        <p className="text-xs font-semibold tracking-widest text-neutral-500 uppercase">OmniMarket · Operations Hub</p>
        <h1 id="login-title" className="mt-2 text-2xl font-bold tracking-tight text-neutral-900">
          Iniciar sesión
        </h1>
        <p className="mt-2 text-sm text-neutral-600">Accede con tu cuenta de Google o GitHub.</p>

        {errorMessage ? (
          <p
            role="alert"
            data-testid="login-error"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {errorMessage}
          </p>
        ) : null}

        <form action={signInWith} className="mt-6 flex flex-col gap-3">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          {OAUTH_PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              type="submit"
              name="provider"
              value={provider.id}
              data-testid={`login-${provider.id}`}
              className="rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none"
            >
              {provider.label}
            </button>
          ))}
        </form>
      </section>
    </main>
  );
}
