/**
 * Production-grade DOM element screenshot utility for BISHOP.
 * Renders HTML elements (e.g. #thermal-receipt) to high-resolution PNG images.
 * Completely handles modern Tailwind CSS colors (lab, oklab, oklch) without throwing parsing errors.
 */

interface ScreenshotOptions {
  scale?: number;
  backgroundColor?: string;
}

/**
 * Converts modern CSS color functions (lab, oklab, oklch, lch, color())
 * into a standard rgb(...) or rgba(...) color string using Canvas 2D or DOM computed style.
 */
export function convertColorToRgb(val: string): string {
  if (!val || typeof val !== "string" || !/oklch|lab|oklab|lch|color\(/i.test(val)) {
    return val;
  }

  if (typeof document === "undefined") return val;

  let ctx: CanvasRenderingContext2D | null = null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    ctx = canvas.getContext("2d");
  } catch {
    ctx = null;
  }

  const colorFuncRegex = /(?:oklch|lab|oklab|lch|color)\([^)]+\)/gi;
  return val.replace(colorFuncRegex, (match) => {
    if (ctx) {
      try {
        ctx.fillStyle = "#000000";
        ctx.fillStyle = match;
        const res = ctx.fillStyle;
        if (res && res !== "#000000" && !/oklch|lab|oklab|lch|color\(/i.test(res)) {
          return res;
        }
      } catch {
        // fallback to DOM div
      }
    }

    try {
      const div = document.createElement("div");
      div.style.color = match;
      document.body.appendChild(div);
      const computed = window.getComputedStyle(div).color;
      document.body.removeChild(div);
      return computed || match;
    } catch {
      return match;
    }
  });
}

export async function captureBillScreenshot(
  elementId: string,
  fileName: string,
  options: ScreenshotOptions = {}
): Promise<void> {
  console.log(`[Screenshot] 2. Screenshot function started for target: #${elementId}`);

  if (typeof window === "undefined" || typeof document === "undefined") {
    const err = new Error("Screenshot utility must be executed in browser environment");
    console.error(`[Screenshot] Error message: ${err.message}`);
    console.error(`[Screenshot] Error stack: ${err.stack}`);
    throw err;
  }

  // 1. Target Element Validation
  const element = document.getElementById(elementId);
  if (!element) {
    const err = new Error(`Bill element #${elementId} not found in DOM`);
    console.error(`[Screenshot] Error message: ${err.message}`);
    console.error(`[Screenshot] Error stack: ${err.stack}`);
    throw err;
  }

  console.log(`[Screenshot] 3. Target element ID found: #${elementId}`);

  const rect = element.getBoundingClientRect();
  const width = Math.ceil(rect.width || element.offsetWidth);
  const height = Math.ceil(rect.height || element.offsetHeight);

  console.log(`[Screenshot] 4. Target element dimensions: width=${width}px, height=${height}px`);

  if (width === 0 || height === 0) {
    const err = new Error(`Bill element #${elementId} is hidden or has zero dimensions (${width}x${height})`);
    console.error(`[Screenshot] Error message: ${err.message}`);
    console.error(`[Screenshot] Error stack: ${err.stack}`);
    throw err;
  }

  const scale = options.scale || 2;
  const bgColor = options.backgroundColor || "#ffffff";

  console.log("[Screenshot] 5. html2canvas/capture started");

  try {
    const html2canvas = (await import("html2canvas")).default;

    const styleProperties = [
      "color",
      "background-color",
      "background-image",
      "border-color",
      "border-top-color",
      "border-right-color",
      "border-bottom-color",
      "border-left-color",
      "border-style",
      "border-top-style",
      "border-right-style",
      "border-bottom-style",
      "border-left-style",
      "border-width",
      "border-top-width",
      "border-right-width",
      "border-bottom-width",
      "border-left-width",
      "border-radius",
      "font-family",
      "font-size",
      "font-weight",
      "font-style",
      "line-height",
      "letter-spacing",
      "text-align",
      "text-transform",
      "text-decoration",
      "padding",
      "padding-top",
      "padding-right",
      "padding-bottom",
      "padding-left",
      "margin",
      "margin-top",
      "margin-right",
      "margin-bottom",
      "margin-left",
      "display",
      "flex-direction",
      "justify-content",
      "align-items",
      "gap",
      "grid-template-columns",
      "box-shadow",
      "text-shadow",
      "opacity",
      "visibility",
      "box-sizing",
      "width",
      "height",
      "min-width",
      "max-width",
      "white-space",
      "word-break",
    ];

    const canvas = await html2canvas(element, {
      scale: scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: bgColor,
      logging: false,
      onclone: (clonedDoc: Document, clonedEl: HTMLElement) => {
        // A. Sanitize all <style> blocks in cloned document
        const styleElements = Array.from(clonedDoc.querySelectorAll("style"));
        for (const styleEl of styleElements) {
          if (styleEl.textContent && /oklch|lab|oklab|lch|color\(/i.test(styleEl.textContent)) {
            styleEl.textContent = convertColorToRgb(styleEl.textContent);
          }
        }

        // B. Remove external stylesheet links in cloned document that might contain unsupported color functions
        const linkElements = Array.from(clonedDoc.querySelectorAll('link[rel="stylesheet"]'));
        for (const linkEl of linkElements) {
          try {
            linkEl.remove();
          } catch {
            // ignore
          }
        }

        // C. Inline computed styles from original elements onto cloned elements
        const win = clonedDoc.defaultView || window;
        const origElements = [element, ...Array.from(element.querySelectorAll("*"))] as HTMLElement[];
        const cloneElements = [clonedEl, ...Array.from(clonedEl.querySelectorAll("*"))] as HTMLElement[];

        for (let i = 0; i < origElements.length; i++) {
          const origEl = origElements[i];
          const cloneEl = cloneElements[i];
          if (!origEl || !cloneEl) continue;

          try {
            const computed = win.getComputedStyle(origEl);
            for (const prop of styleProperties) {
              let val = computed.getPropertyValue(prop);
              if (val) {
                val = convertColorToRgb(val);
                cloneEl.style.setProperty(prop, val, "important");
              }
            }
          } catch {
            // ignore computed style retrieval error
          }

          const inlineStyle = cloneEl.getAttribute("style") || "";
          if (/oklch|lab|oklab|lch|color\(/i.test(inlineStyle)) {
            cloneEl.setAttribute("style", convertColorToRgb(inlineStyle));
          }
        }

        // Set explicit root dimensions & background on cloned root
        clonedEl.style.setProperty("width", `${width}px`, "important");
        clonedEl.style.setProperty("height", `${height}px`, "important");
        clonedEl.style.setProperty("background-color", bgColor, "important");
        clonedEl.style.setProperty("box-sizing", "border-box", "important");
      },
    });

    console.log("[Screenshot] 6. Capture succeeded");
    console.log(`[Screenshot] 7. Canvas dimensions: ${canvas.width}x${canvas.height}`);

    // Create Blob from Canvas
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/png", 1.0);
    });

    if (!blob) {
      throw new Error("Failed to generate PNG Blob from canvas");
    }

    console.log(`[Screenshot] 8. Blob/dataURL creation succeeded (Blob size: ${blob.size} bytes)`);

    // Trigger Download / Mobile Share
    const safeFileName = fileName.endsWith(".png") ? fileName : `${fileName}.png`;

    // Try native Mobile Share if available and supported
    let shareSuccessful = false;
    if (typeof navigator !== "undefined" && navigator.share && navigator.canShare) {
      try {
        const file = new File([blob], safeFileName, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "BISHOP Order Bill",
            text: `Receipt for order ${fileName}`,
            files: [file],
          });
          shareSuccessful = true;
          console.log("[Screenshot] 9. Download triggered (via Web Share API)");
        }
      } catch (shareErr: any) {
        if (shareErr?.name !== "AbortError") {
          console.warn("[Screenshot] Web Share API failed, falling back to direct download link:", shareErr);
        }
      }
    }

    if (!shareSuccessful) {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = safeFileName;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();

      console.log("[Screenshot] 9. Download triggered (via temporary <a> download link)");

      setTimeout(() => {
        try {
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        } catch {
          // ignore
        }
      }, 500);
    }
  } catch (err: any) {
    console.error(`[Screenshot] Error message: ${err?.message || String(err)}`);
    console.error(`[Screenshot] Error stack: ${err?.stack || "No stack trace available"}`);
    throw err;
  }
}

