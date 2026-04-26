export default function Footer() {
  return (
    <footer className="bg-white border-t border-stone-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-6 text-center flex flex-col items-center gap-3">
        <p className="text-stone-600 text-sm">
          © 2026 ZineMap, a community-maintained map of the global zine scene. Follow <a href="https://www.instagram.com/zine.map" target="_blank" className="text-rose-500 hover:text-rose-600">@zine.map</a> for site updates.
        </p>
        <a
          href="https://ko-fi.com/cjwu"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-[#d8c2a3] bg-[#f8ecd8] px-3.5 py-1.5 text-sm font-semibold text-[#5b3a29] shadow-sm transition-colors hover:bg-[#f3e2c8]"
          aria-label="Support ZineMap on Ko-fi"
        >
          <img
            src="https://storage.ko-fi.com/cdn/cup-border.png"
            alt=""
            aria-hidden="true"
            className="h-3.5 w-auto object-contain"
            loading="lazy"
          />
          <span>Support ZineMap on Ko-fi</span>
        </a>
      </div>
    </footer>
  );
}
