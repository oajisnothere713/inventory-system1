import React from "react";
import { Item } from "../../types/items";

export default function SearchResults({ results, onSelect }: { results: Item[]; onSelect: (i: Item) => void }) {
  return (
    <div className="search-results">
      {results.map((item) => (
          <div
            key={item.id}
            className="sr-item"
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(item);
            }}>
          <div>
            <div className="sr-name">{item.name}</div>
            <div className="sr-sub">{item.sub} · {item.dept}</div>
          </div>
          <div className="sr-right">
            <div className="sr-stock">{item.currentStock.toLocaleString()} {item.unit}</div>
            <div className="sr-cat">{item.category} · {item.subcat}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
