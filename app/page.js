'use client';

import { useState } from 'react';
import styles from './page.module.css';

export default function Home() {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    setHasSearched(true);
    setResults([]);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(keyword)}`);
      const data = await res.json();
      if (data.results) {
        setResults(data.results);
      }
    } catch (error) {
      console.error('Failed to fetch results', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlatformClass = (platform) => {
    if (platform === 'PChome') return styles.platformPChome;
    if (platform === 'MOMO') return styles.platformMOMO;
    if (platform === 'Yahoo') return styles.platformYahoo;
    return '';
  };

  return (
    <main className={styles.container}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Price Compare</h1>
        <p className={styles.subtitle}>
          Find the best deals across MOMO, PChome, and Yahoo in seconds.
        </p>
      </div>

      <form className={styles.searchContainer} onSubmit={handleSearch}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search for products (e.g., iPhone 15, 衛生紙)"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button 
          type="submit" 
          className={styles.searchButton}
          disabled={loading || !keyword.trim()}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {loading && (
        <div className={styles.loader}>
          <div className={styles.spinner}></div>
        </div>
      )}

      {!loading && hasSearched && results.length === 0 && (
        <div className={styles.emptyState}>
          No products found for "{keyword}". Please try a different search term.
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className={styles.resultsGrid}>
          {results.map((product) => (
            <a 
              href={product.link} 
              target="_blank" 
              rel="noopener noreferrer" 
              className={`${styles.productCard} glass`}
              key={product.id}
            >
              <div className={styles.imageContainer}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={product.image || 'https://via.placeholder.com/200?text=No+Image'} 
                  alt={product.title} 
                  className={styles.productImage}
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/200?text=Image+Error'; }}
                />
              </div>
              <span className={`${styles.productPlatform} ${getPlatformClass(product.platform)}`}>
                {product.platform}
              </span>
              <h3 className={styles.productTitle} title={product.title}>
                {product.title}
              </h3>
              <div className={styles.productPrice}>
                <span className={styles.currency}>NT$</span>
                {product.price.toLocaleString()}
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
