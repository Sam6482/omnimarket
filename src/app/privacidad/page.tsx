import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de privacidad | OmniMarket" };

const UPDATED_AT = "25 de octubre de 2026";

/** Política de privacidad pública (requerida por Google para publicar el cliente OAuth). */
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-neutral-800">
      <p className="text-xs font-semibold tracking-widest text-neutral-500 uppercase">OmniMarket · Operations Hub</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900">Política de privacidad</h1>
      <p className="mt-2 text-sm text-neutral-500">Última actualización: {UPDATED_AT}</p>

      <section className="mt-8 space-y-4 leading-relaxed">
        <p>
          OmniMarket Operations Hub es un proyecto académico de demostración. Esta página explica qué datos
          usamos cuando inicias sesión con Google o GitHub.
        </p>

        <h2 className="pt-4 text-xl font-semibold text-neutral-900">Datos que recibimos</h2>
        <p>
          Al iniciar sesión, el proveedor que elijas (Google o GitHub) nos comparte tu nombre, tu correo
          electrónico y tu foto de perfil. No solicitamos acceso a tus archivos, contactos ni repositorios.
        </p>

        <h2 className="pt-4 text-xl font-semibold text-neutral-900">Para qué los usamos</h2>
        <p>
          Solo para identificarte, mantener tu sesión abierta y registrar qué usuario realizó cambios en los
          pedidos de demostración. No los vendemos, no los compartimos con terceros y no los usamos con fines
          publicitarios.
        </p>

        <h2 className="pt-4 text-xl font-semibold text-neutral-900">Almacenamiento</h2>
        <p>
          Los datos se guardan en una base de datos PostgreSQL alojada en Neon y la aplicación se sirve desde
          Vercel mediante HTTPS. Las sesiones expiran a los 7 días.
        </p>

        <h2 className="pt-4 text-xl font-semibold text-neutral-900">Tus derechos</h2>
        <p>
          Puedes revocar el acceso en cualquier momento desde la configuración de seguridad de tu cuenta de
          Google o GitHub, y solicitar la eliminación de tus datos escribiendo a{" "}
          <a className="font-medium text-neutral-900 underline" href="mailto:20243ds136@utez.edu.mx">
            20243ds136@utez.edu.mx
          </a>
          .
        </p>
      </section>
    </main>
  );
}
