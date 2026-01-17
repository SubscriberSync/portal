'use client';

import { useState } from 'react';
import type { PrintMethod } from '@/lib/pack-types';
import { getExportCsvUrl, getShopifyOrdersUrl } from '@/lib/pack-api';

interface PrintSelectorProps {
  clientSlug: string;
  shopifyStore?: string;
}

export function PrintSelector({ clientSlug, shopifyStore }: PrintSelectorProps) {
  const [method, setMethod] = useState<PrintMethod>('shopify');

  const handleOpenShopify = () => {
    if (shopifyStore) {
      window.open(getShopifyOrdersUrl(shopifyStore), '_blank');
    }
  };

  const handleDownloadCSV = () => {
    window.location.href = getExportCsvUrl(clientSlug);
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-border">
      <h3 className="text-lg font-semibold text-foreground mb-4">PRINT LABELS</h3>

      <div className="flex gap-6 mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="printMethod"
            value="shopify"
            checked={method === 'shopify'}
            onChange={() => setMethod('shopify')}
            className="w-4 h-4 text-accent"
          />
          <span className="text-foreground">Shopify Shipping</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="printMethod"
            value="pirateship"
            checked={method === 'pirateship'}
            onChange={() => setMethod('pirateship')}
            className="w-4 h-4 text-accent"
          />
          <span className="text-foreground">Pirate Ship</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="printMethod"
            value="other"
            checked={method === 'other'}
            onChange={() => setMethod('other')}
            className="w-4 h-4 text-accent"
          />
          <span className="text-foreground">Other</span>
        </label>
      </div>

      {method === 'shopify' && (
        <button
          onClick={handleOpenShopify}
          disabled={!shopifyStore}
          className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          OPEN IN SHOPIFY
        </button>
      )}

      {method === 'pirateship' && (
        <button
          onClick={handleDownloadCSV}
          className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
        >
          DOWNLOAD CSV
        </button>
      )}

      {method === 'other' && (
        <p className="text-foreground-secondary">
          Print labels in your preferred app, then click Start Packing.
        </p>
      )}
    </div>
  );
}
