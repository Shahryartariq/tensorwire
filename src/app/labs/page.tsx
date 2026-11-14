import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Section } from "@/components/Section";
import { getWire, official } from "@/lib/load";
import { pagedMeta, readPage } from "@/lib/paging";
import { pageMeta } from "@/lib/site";
import { SOURCES } from "@/lib/sources";

const description =
  "Official AI announcements in one place: new models, research and products from OpenAI, Google DeepMind, Hugging Face, Microsoft Research, NVIDIA and AWS.";

const metadata: Metadata = {
  title: "Official AI announcements from the labs",
  description,
  ...pageMeta("/labs", "Official AI announcements from the labs", description),
};

export async function generateMetadata({ searchParams }: PageProps<"/labs">): Promise<Metadata> {
  return pagedMeta(metadata, "/labs", readPage((await searchParams).page) ?? 1);
}

export default async function LabsPage({ searchParams }: PageProps<"/labs">) {
  const page = readPage((await searchParams).page);
  if (page === null) notFound();
  const wire = await getWire();
  const labs = SOURCES.filter((s) => s.kind === "lab").map((s) => s.name);
  return (
    <Section
      wire={wire}
      clusters={wire.clusters.filter(official)}
      active="labs"
      path="/labs"
      name="From the labs"
      title="Official AI announcements from the labs"
      intro={
        <p>
          Posts published by the companies themselves: {labs.slice(0, -1).join(", ")} and {labs.at(-1)}. When the press
          covers one, the coverage is listed under it.
        </p>
      }
      emptyText="No lab posts in the last three weeks."
      page={page}
    />
  );
}
