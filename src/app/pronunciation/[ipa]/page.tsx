import defaultIpaData from "../../../../public/data/default_ipa.json";
import IPADetailsClientPage from "./IPADetailsClientPage";

export function generateStaticParams() {
  return defaultIpaData.sounds.map((sound) => ({
    ipa: encodeURIComponent(sound.ipa),
  }));
}

interface PageProps {
  params: Promise<{ ipa: string }>;
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;
  return <IPADetailsClientPage ipa={resolvedParams.ipa} />;
}
