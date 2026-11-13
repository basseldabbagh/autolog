import { initCookieConsent } from "./features/cookieConsent";
import { initPwaInstall } from "./features/pwaInstall";
import { applyInitialThemeClass, initThemeFeature } from "./features/theme";
import { escapeHtml } from "./utils/format";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface FaqCategory {
  id: string;
  name: string;
  faqs: FaqItem[];
}

interface FaqDataset {
  categories: FaqCategory[];
}

applyInitialThemeClass();

function renderFaqCategories(categories: FaqCategory[], query: string, selectedCategory: string): void {
  const container = document.getElementById("faqContentContainer");
  if (!container) return;

  const q = query.trim().toLowerCase();
  const filtered = categories
    .filter((cat) => selectedCategory === "all" || cat.id === selectedCategory)
    .map((cat) => ({
      ...cat,
      faqs: cat.faqs.filter(
        (item) =>
          !q ||
          item.question.toLowerCase().includes(q) ||
          item.answer.toLowerCase().includes(q) ||
          cat.name.toLowerCase().includes(q),
      ),
    }))
    .filter((cat) => cat.faqs.length > 0);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 text-center text-sm text-slate-400">
        No matching questions found. Try clearing your search filter or view <a href="/faqs.md" class="text-indigo-700 dark:text-indigo-400 underline">faqs.md</a>.
      </div>
    `;
    return;
  }

  container.innerHTML = filtered
    .map(
      (cat) => `
      <article class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-4" aria-labelledby="cat-${escapeHtml(cat.id)}">
        <h2 id="cat-${escapeHtml(cat.id)}" class="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
          <span class="w-1.5 h-5 rounded-full bg-indigo-500 inline-block"></span>
          ${escapeHtml(cat.name)}
        </h2>
        <div class="space-y-2.5">
          ${cat.faqs
            .map(
              (item) => `
            <details id="${escapeHtml(item.id)}" class="group bg-slate-950/70 border border-slate-800 rounded-xl p-4 transition-all hover:border-slate-700 open:border-indigo-500/40">
              <summary class="flex items-center justify-between cursor-pointer font-semibold text-sm text-slate-100 group-hover:text-white list-none select-none gap-3">
                <span>${escapeHtml(item.question)}</span>
                <svg class="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div class="mt-2.5 text-sm text-slate-300 leading-relaxed pt-2.5 border-t border-slate-800/70">
                ${escapeHtml(item.answer)}
              </div>
            </details>
          `,
            )
            .join("")}
        </div>
      </article>
    `,
    )
    .join("");
}

document.addEventListener("DOMContentLoaded", async () => {
  initThemeFeature();
  initCookieConsent();
  initPwaInstall();

  const searchInput = document.getElementById("faqSearchInput") as HTMLInputElement | null;
  const categorySelect = document.getElementById("faqCategoryFilter") as HTMLSelectElement | null;

  try {
    const res = await fetch("/data/faqs.json");
    if (!res.ok) return;
    const data = (await res.json()) as FaqDataset;
    const categories = Array.isArray(data.categories) ? data.categories : [];

    if (categorySelect && categories.length > 0) {
      categorySelect.innerHTML =
        `<option value="all">All Categories</option>` +
        categories.map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join("");
    }

    const update = () => {
      renderFaqCategories(categories, searchInput?.value || "", categorySelect?.value || "all");
    };

    searchInput?.addEventListener("input", update);
    categorySelect?.addEventListener("change", update);
  } catch {
    // Pre-rendered static HTML remains visible if fetch fails offline
  }
});
