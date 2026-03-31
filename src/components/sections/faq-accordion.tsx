"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
}

export function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        setOpenIndex(openIndex === index ? null : index);
        break;
      case "ArrowDown":
        e.preventDefault();
        const nextIndex = (index + 1) % items.length;
        buttonRefs.current[nextIndex]?.focus();
        break;
      case "ArrowUp":
        e.preventDefault();
        const prevIndex = (index - 1 + items.length) % items.length;
        buttonRefs.current[prevIndex]?.focus();
        break;
      case "Home":
        e.preventDefault();
        buttonRefs.current[0]?.focus();
        break;
      case "End":
        e.preventDefault();
        buttonRefs.current[items.length - 1]?.focus();
        break;
    }
  };

  return (
    <div className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white" role="region" aria-label="Frequently asked questions">
      {items.map((item, index) => (
        <div key={index}>
          <button
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-gray-50"
            aria-expanded={openIndex === index}
            aria-controls={`faq-answer-${index}`}
          >
            <span className="text-sm font-medium text-gray-900 pr-4">{item.question}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200",
                openIndex === index && "rotate-180 text-purple-600"
              )}
              aria-hidden="true"
            />
          </button>
          <div
            id={`faq-answer-${index}`}
            className={cn(
              "grid transition-all duration-200 ease-in-out",
              openIndex === index ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="overflow-hidden">
              <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">
                {item.answer}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
