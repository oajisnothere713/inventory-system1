import React from 'react';

type Item = {
  totalStock: number;
  minStock: number;
  category: string;
  subcat: string;
  unit: string;
};

export default function ItemBadges({ item, extra }: { item: Item; extra?: React.ReactNode }) {
  const stockStatus = item.totalStock <= item.minStock ? 'badge-warn' : 'badge-ok';
  return (
    <div className="si-badges">
      <span className={`badge ${item.category === 'CAPEX' ? 'badge-capex' : 'badge-opex'}`}>{item.category}</span>
      <span className="badge badge-sub">{item.subcat}</span>
      <span className={`badge ${stockStatus}`}>{item.totalStock.toLocaleString()} {item.unit} in stock</span>
      {extra}
    </div>
  );
}
