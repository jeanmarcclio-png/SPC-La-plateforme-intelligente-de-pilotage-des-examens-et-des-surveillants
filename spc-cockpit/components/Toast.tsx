"use client";

import { Toaster as SonnerToaster, toast } from "sonner";

export function showToast(message: string, type: "success" | "error" = "success") {
  if (type === "error") {
    toast.error(message);
  } else {
    toast.success(message);
  }
}

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      offset={{ bottom: "84px" }}
      mobileOffset={{ bottom: "84px" }}
      toastOptions={{
        classNames: {
          toast: "!rounded-full !shadow-lg !text-[13px] !font-semibold !border-0 !w-auto !px-4 !py-2.5",
          success: "!bg-[var(--color-primary)] !text-white",
          error: "!bg-red-500 !text-white",
        },
      }}
    />
  );
}
