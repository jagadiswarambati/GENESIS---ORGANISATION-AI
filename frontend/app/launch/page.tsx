"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/design-system/button";
import { icons } from "@/lib/icons";

/** Brief confirmation before entering the organization headquarters. */
export default function LaunchPlaceholderPage(): React.JSX.Element {
  const Icon = icons.complete;
  const router = useRouter();
  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-5">
      <section className="max-w-reading text-center">
        <span className="bg-success/15 text-success mx-auto flex size-12 items-center justify-center rounded-2xl">
          <Icon aria-hidden="true" size={22} />
        </span>
        <p className="text-label text-muted mt-6">Organization prepared</p>
        <h1 className="text-heading mt-2">Your organization is ready to launch.</h1>
        <p className="text-body text-secondary mt-3">
          Mission Control will become the organization&apos;s headquarters.
        </p>
        <Button className="mt-7" onClick={() => router.push("/mission-control")} size="lg">
          Launch Organization
        </Button>
      </section>
    </main>
  );
}
