import { Suspense } from "react";
import GifEditor from "@/components/GifEditor";

export default function GifEditorPage() {
  return (
    <Suspense fallback={null}>
      <GifEditor />
    </Suspense>
  );
}
