"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function charactersIn(word: string): string[] {
  if (typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(word), (part) => part.segment);
  }
  return Array.from(word);
}

export function ScrollTypedSynopsis({ text, reducedMotion }: { text: string; reducedMotion: boolean }) {
  const paragraphRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const paragraph = paragraphRef.current;
    if (!paragraph || reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const characters = Array.from(paragraph.querySelectorAll<HTMLElement>("[data-typed-character]"));
    let revealed = 0;
    let trigger: ScrollTrigger | undefined;
    const restore = () => characters.forEach((character) => { character.style.visibility = ""; });
    const reveal = (progress: number) => {
      const count = Math.max(revealed, Math.min(characters.length, Math.floor(progress * characters.length)));
      for (let index = revealed; index < count; index += 1) characters[index].style.visibility = "";
      revealed = count;
    };

    try {
      trigger = ScrollTrigger.create({
        trigger: paragraph,
        // The last paragraph cannot reach the usual viewport positions.
        // Move its typing interval into the scroll space that remains.
        start: () => {
          const top = paragraph.getBoundingClientRect().top + window.scrollY;
          const maximum = ScrollTrigger.maxScroll(window);
          return Math.max(0, Math.min(top - window.innerHeight * 0.85, maximum - window.innerHeight * 0.4));
        },
        end: () => {
          const top = paragraph.getBoundingClientRect().top + window.scrollY;
          return Math.max(0, Math.min(top - window.innerHeight * 0.45, ScrollTrigger.maxScroll(window)));
        },
        onUpdate: (self) => reveal(self.progress),
        onRefresh: (self) => reveal(ScrollTrigger.maxScroll(window) <= 0 ? 1 : self.progress),
      });
      reveal(trigger.progress);
      // Hide only after initialization succeeds. Invisible characters retain their layout.
      characters.forEach((character, index) => { character.style.visibility = index < revealed ? "" : "hidden"; });
    } catch {
      trigger?.kill();
      restore();
    }

    return () => {
      trigger?.kill();
      restore();
    };
  }, [text, reducedMotion]);

  return (
    <p className="portfolio-home__synopsis scroll-typed-synopsis" ref={paragraphRef} data-project-body="">
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.split(/(\s+)/u).map((word, wordIndex) => (
          /\s/u.test(word) ? word : (
            <span className="scroll-typed-synopsis__word" key={wordIndex}>
              {charactersIn(word).map((character, characterIndex) => (
                <span key={characterIndex} data-typed-character="">{character}</span>
              ))}
            </span>
          )
        ))}
      </span>
    </p>
  );
}
