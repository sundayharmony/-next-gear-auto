import React from "react";
import { cn } from "@/lib/utils/cn";

interface PageContainerProps extends Omit<React.ComponentPropsWithoutRef<"div">, "className"> {
  children: React.ReactNode;
  className?: string;
  narrow?: boolean;
  as?: "div" | "main";
}

export function PageContainer({
  children,
  className,
  narrow = false,
  as: Tag = "div",
  ...rest
}: PageContainerProps) {
  return (
    <Tag
      {...rest}
      className={cn(
        "mx-auto px-3 py-6 sm:px-6 sm:py-8 lg:px-8",
        narrow ? "max-w-4xl" : "max-w-7xl",
        className
      )}
    >
      {children}
    </Tag>
  );
}
