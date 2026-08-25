// O tema segue o sistema operacional, e uma escolha guardada vence sobre ele. O script
// pré-pintura no index.html aplica a escolha guardada antes do primeiro quadro; este
// módulo é a metade de runtime: ler o tema em vigor e virá-lo. O token que o fundo do
// body lê depende do atributo data-theme, então mudar o atributo é o ato inteiro.

export type Theme = "light" | "dark";

const STORAGE_KEY = "mg-theme";

export function storedTheme(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

export function systemTheme(): Theme {
  return typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** O que a página está mostrando agora: a escolha guardada, ou o sistema. */
export function effectiveTheme(): Theme {
  return storedTheme() ?? systemTheme();
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* sem storage — o atributo ainda vale enquanto esta página viver */
  }
}

/** Vira para o outro tema e persiste; devolve o tema que passou a valer. */
export function toggleTheme(): Theme {
  const next: Theme = effectiveTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}
