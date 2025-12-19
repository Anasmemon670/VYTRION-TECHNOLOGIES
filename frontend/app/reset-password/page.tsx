import { Suspense } from "react";
import ResetPasswordPage from "@/pages/ResetPasswordPage";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordPage />
    </Suspense>
  );
}
