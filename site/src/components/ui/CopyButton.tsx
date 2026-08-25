import { useState } from "react";

function fallbackCopy(text: string) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } catch {
    /* não há mais o que tentar */
  }
  document.body.removeChild(ta);
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const onClick = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        fallbackCopy(text);
      }
    } catch {
      fallbackCopy(text);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      type="button"
      className={copied ? "copy-btn copied" : "copy-btn"}
      onClick={onClick}
      aria-label={label}
    >
      <span aria-hidden="true">{copied ? "✓" : "⧉"}</span>
      <span>{copied ? "Copiado!" : "Copiar"}</span>
    </button>
  );
}

/** Um comando de terminal com o botão de copiar ao lado. */
export function CommandLine({ cmd }: { cmd: string }) {
  return (
    <div className="codeblock copy">
      <code>
        <span className="g">$</span> {cmd}
      </code>
      <CopyButton text={cmd} label={`Copiar o comando: ${cmd}`} />
    </div>
  );
}
