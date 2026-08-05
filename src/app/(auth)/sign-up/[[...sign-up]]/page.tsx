import { SignUp } from "@clerk/nextjs";

export const metadata = { title: "Criar conta" };

export default function SignUpPage() {
  return (
    <div className="flex flex-col items-center gap-6">
      <h1 className="font-serif text-3xl text-[var(--color-navy)]">
        Criar conta
      </h1>
      <SignUp
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
