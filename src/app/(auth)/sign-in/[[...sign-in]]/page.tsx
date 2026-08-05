import { SignIn } from "@clerk/nextjs";

export const metadata = { title: "Entrar" };

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center gap-6">
      <h1 className="font-serif text-3xl text-[var(--color-navy)]">Entrar</h1>
      <SignIn
        appearance={{
          elements: {
            formButtonPrimary:
              "bg-[var(--color-brown)] hover:bg-[var(--color-brown-600)]",
            card: "shadow-none border border-[var(--border)]",
          },
        }}
      />
    </div>
  );
}
