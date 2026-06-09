import React from "react";
import { cn } from "@/lib/utils/cn";

interface PageContainerProps extends Omit<React.ComponentPropsWithoutRef<"main">, "className"> {
  children: React.ReactNode;
  className?: string;
  narrow?: boolean;
}

export function PageContainer({ children, className, narrow = false, ...rest }: PageContainerProps) {
  return (
    <main
      {...rest}
      className={cn(
        "mx-auto px-4 py-8 sm:px-6 lg:px-8",
        narrow ? "max-w-4xl" : "max-w-7xl",
        className
      )}
    >
      {children}
    </main>
  );
}
