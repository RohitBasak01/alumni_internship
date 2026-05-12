import{j as r}from"./index-Dsr6G4_-.js";function o({size:e="md",color:s="brand",className:d="",label:n="Loading..."}){const a={xs:"h-3 w-3 border-2",sm:"h-4 w-4 border-2",md:"h-6 w-6 border-3",lg:"h-8 w-8 border-4",xl:"h-12 w-12 border-4"},t={brand:"border-brand-600 border-t-transparent",white:"border-white border-t-transparent",slate:"border-slate-600 border-t-transparent",primary:"border-[#6366f1] border-t-transparent",success:"border-emerald-600 border-t-transparent",warning:"border-amber-600 border-t-transparent",danger:"border-rose-600 border-t-transparent"};return r.jsxs("div",{className:`inline-flex items-center justify-center ${d}`,role:"status","aria-label":n,children:[r.jsx("div",{className:`
          ${a[e]||a.md}
          ${t[s]||t.brand}
          rounded-full animate-spin
        `}),r.jsx("span",{className:"sr-only",children:n})]})}function b({size:e="sm",color:s="white"}){return r.jsx(o,{size:e,color:s,className:"mr-2"})}export{b as B,o as L};
