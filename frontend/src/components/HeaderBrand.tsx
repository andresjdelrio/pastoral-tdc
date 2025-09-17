import React from 'react';

export function HeaderBrand() {
  return (
    <div className="w-full">
      {/* Top red strip */}
      <div className="w-full h-1 bg-brand-red"></div>

      {/* Logo section */}
      <div className="py-6 bg-white">
        <img
          src="/assets/logo-finis.png"
          alt="Finis Terrae"
          className="h-14 mx-auto my-3 object-contain"
          onError={(e) => {
            // Fallback if logo doesn't exist
            e.currentTarget.style.display = 'none';
            const placeholder = document.createElement('div');
            placeholder.className = 'h-14 w-32 mx-auto bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500';
            placeholder.textContent = 'LOGO';
            e.currentTarget.parentNode?.appendChild(placeholder);
          }}
        />
      </div>

      {/* Title banner */}
      <div className="w-full bg-brand-teal text-white py-3 text-center">
        <h1 className="text-lg font-semibold uppercase tracking-wide">
          DIRECCIÓN DE PASTORAL | INDICADORES TOTALES
        </h1>
      </div>
    </div>
  );
}