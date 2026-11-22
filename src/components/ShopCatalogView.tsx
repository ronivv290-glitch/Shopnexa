import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { ProductCard } from './ProductCard.tsx';

interface ShopCatalogViewProps {
  initialFilter?: string;
  initialCategoryId?: number;
  initialSearch?: string;
}

export function ShopCatalogView({
  initialFilter = 'all',
  initialCategoryId,
  initialSearch = '',
}: ShopCatalogViewProps) {
  const { products, categories } = useStore();
  const [filter, setFilter] = useState(initialFilter && initialFilter !== 'affiliate' ? initialFilter : 'all');
  const [categoryId, setCategoryId] = useState<number | 'all'>(initialCategoryId ?? 'all');
  const [search, setSearch] = useState(initialSearch);
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'discount'>('newest');

  React.useEffect(() => {
    setFilter(initialFilter && initialFilter !== 'affiliate' ? initialFilter : 'all');
  }, [initialFilter]);

  React.useEffect(() => {
    setCategoryId(initialCategoryId ?? 'all');
  }, [initialCategoryId]);

  React.useEffect(() => {
    setSearch(initialSearch || '');
  }, [initialSearch]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products.filter((p) => {
      if (p.product_type !== 'own') return false;
      if (filter === 'discount' && p.discount_percentage <= 0 && !p.is_special_offer) return false;
      if (filter === 'new' && !p.is_new_arrival) return false;
      if (filter === 'featured' && !p.is_featured) return false;
      if (categoryId !== 'all' && p.category_id !== categoryId) return false;
      if (q) {
        const hay = `${p.name} ${p.brand} ${p.sku} ${p.product_code} ${p.category_name || ''} ${p.short_description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      const priceA = a.sale_price > 0 ? a.sale_price : a.selling_price;
      const priceB = b.sale_price > 0 ? b.sale_price : b.selling_price;
      if (sortBy === 'price-asc') return priceA - priceB;
      if (sortBy === 'price-desc') return priceB - priceA;
      if (sortBy === 'discount') return b.discount_percentage - a.discount_percentage;
      return b.id - a.id;
    });
  }, [products, filter, categoryId, search, sortBy]);

  const filterTabs = [
    { id: 'all', label: 'All Products' },
    { id: 'own', label: 'Direct Vault' },
    { id: 'discount', label: 'Discount Products' },
    { id: 'new', label: 'New Collections' },
    { id: 'featured', label: 'Featured Collections' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="border-b border-zinc-200 pb-6 mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[#9C7A16]">SHOPNEXA CATALOG</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-zinc-950 mt-1">
            {categoryId !== 'all'
              ? categories.find((c) => c.id === categoryId)?.name || 'Category'
              : filterTabs.find((f) => f.id === filter)?.label || 'All Products'}
          </h1>
          <p className="text-xs text-zinc-500 mt-1 font-mono tabular-nums">
            Showing {filtered.length} product{filtered.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by keyword, brand, SKU..."
              className="border border-zinc-300 pl-9 pr-3 py-2 text-xs w-60 focus:border-black focus:outline-none"
            />
          </div>

          <select
            value={categoryId === 'all' ? 'all' : String(categoryId)}
            onChange={(e) => setCategoryId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="border border-zinc-300 px-3 py-2 text-xs bg-white focus:border-black focus:outline-none"
          >
            <option value="all">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 border border-zinc-300 px-3 py-2 bg-white">
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs bg-transparent focus:outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="discount">Highest Discount</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        {filterTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            className={`px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              filter === t.id
                ? 'bg-zinc-950 text-white'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            {t.label}
          </button>
        ))}

        {(categoryId !== 'all' || search) && (
          <button
            type="button"
            onClick={() => {
              setCategoryId('all');
              setSearch('');
              setFilter('all');
            }}
            className="px-3 py-2 text-xs font-medium text-zinc-600 hover:text-black flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="border border-zinc-200 p-12 text-center space-y-3">
          <p className="text-sm font-semibold text-zinc-950">No matching products found</p>
          <p className="text-xs text-zinc-500">
            Try clearing your search query or switching to All Categories.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((prod) => (
            <ProductCard key={prod.id} product={prod} />
          ))}
        </div>
      )}
    </div>
  );
}
