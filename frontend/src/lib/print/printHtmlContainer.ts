export function printHtmlElementInIframe(options: {
  elementId: string;
  title: string;
  pageCss?: string;
}): void {
  const container = document.getElementById(options.elementId);
  if (!container) return;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  const escapedTitle = options.title
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const stylesHtml = Array.from(
    document.querySelectorAll("style, link[rel='stylesheet']"),
  )
    .map((el) => el.outerHTML)
    .join("\n");

  doc.open();
  doc.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <base href="${window.location.origin}/" />
  <title>${escapedTitle}</title>
  ${stylesHtml}
  <style>
    @page { size: A4 portrait; margin: 0; }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    ${options.pageCss ?? ""}
  </style>
</head>
<body>${container.outerHTML}</body>
</html>`);
  doc.close();

  const prevTitle = document.title;
  document.title = options.title;
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.title = prevTitle;
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1500);
  }, 300);
}
