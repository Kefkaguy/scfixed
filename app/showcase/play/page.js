import CharacterSelect from "@/components/CharacterSelects/CharacterSelect";

export default async function PublicShowcasePlayPage({ searchParams }) {
  const params = await searchParams;
  const allowPreloadedAssets = params?.builtins === "1";

  return <CharacterSelect publicGallery allowPreloadedAssets={allowPreloadedAssets} />;
}
