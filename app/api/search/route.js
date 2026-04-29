import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
};

async function fetchPChome(keyword) {
  try {
    const url = `https://ecshweb.pchome.com.tw/search/v3.3/all/results?q=${encodeURIComponent(keyword)}&page=1&sort=sale/dc`;
    const response = await axios.get(url, { headers: HEADERS, timeout: 8000 });
    
    if (!response.data || !response.data.prods) return [];

    return response.data.prods.map(prod => ({
      id: `pchome-${prod.Id}`,
      platform: 'PChome',
      title: prod.name,
      price: prod.price,
      image: `https://cs-d.ecimg.tw${prod.picS}`,
      link: `https://24h.pchome.com.tw/prod/${prod.Id}`
    })).slice(0, 10);
  } catch (error) {
    console.error('PChome fetch error:', error.message);
    return [];
  }
}

async function fetchMomo(keyword) {
  try {
    const url = `https://m.momoshop.com.tw/search.momo?searchKeyword=${encodeURIComponent(keyword)}`;
    const response = await axios.get(url, { headers: HEADERS, timeout: 8000 });
    const $ = cheerio.load(response.data);
    
    const products = [];
    $('.goodsItemLi').each((i, el) => {
      if (i >= 10) return false;
      const title = $(el).find('.prdName').text().trim();
      const priceStr = $(el).find('.price b').text().replace(/,/g, '');
      const price = parseInt(priceStr, 10);
      const imgRaw = $(el).find('img').attr('src');
      let image = imgRaw || '';
      // If it's a relative URL, prepend
      if (image && !image.startsWith('http')) {
         image = image.startsWith('//') ? `https:${image}` : `https://m.momoshop.com.tw${image}`;
      }
      let linkRaw = $(el).find('a').attr('href');
      let link = linkRaw || '';
      if (link && !link.startsWith('http')) {
         link = link.startsWith('//') ? `https:${link}` : `https://m.momoshop.com.tw${link}`;
      }
      
      if (title && !isNaN(price)) {
        products.push({
          id: `momo-${i}-${price}`,
          platform: 'MOMO',
          title,
          price,
          image,
          link
        });
      }
    });
    return products;
  } catch (error) {
    console.error('MOMO fetch error:', error.message);
    return [];
  }
}

async function fetchYahoo(keyword) {
  try {
    const url = `https://tw.buy.yahoo.com/search/product?p=${encodeURIComponent(keyword)}`;
    const response = await axios.get(url, { headers: HEADERS, timeout: 8000 });
    const $ = cheerio.load(response.data);
    
    const products = [];
    // Yahoo's markup often uses classes like .BaseGridItem__grid___2wuJ7 or similar. 
    // We try to catch standard a tags wrapping items.
    $('a[href*="/gdsale/"]').each((i, el) => {
      if (i >= 15) return false;
      const link = $(el).attr('href');
      
      // Look for title and price inside this link
      const title = $(el).find('span').filter((_, span) => {
          const cls = $(span).attr('class') || '';
          return cls.includes('title') || cls.includes('Name');
      }).first().text().trim() || $(el).attr('title') || $(el).text().split('$')[0].trim();
      
      const priceText = $(el).find('span').filter((_, span) => {
          return $(span).text().includes('$');
      }).first().text().replace(/[$,]/g, '').trim();
      
      const price = parseInt(priceText, 10);
      
      const imgRaw = $(el).find('img').attr('src') || $(el).find('img').attr('srcset');
      let image = imgRaw ? imgRaw.split(' ')[0] : '';
      
      if (title && !isNaN(price) && link) {
        // avoid duplicates
        if (!products.find(p => p.link === link)) {
            products.push({
            id: `yahoo-${i}-${price}`,
            platform: 'Yahoo',
            title,
            price,
            image,
            link
            });
        }
      }
    });
    return products.slice(0, 10);
  } catch (error) {
    console.error('Yahoo fetch error:', error.message);
    return [];
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ error: 'Missing keyword' }, { status: 400 });
  }

  // Fetch concurrently
  const [pchome, momo, yahoo] = await Promise.allSettled([
    fetchPChome(q),
    fetchMomo(q),
    fetchYahoo(q)
  ]);

  let results = [];
  if (pchome.status === 'fulfilled') results = results.concat(pchome.value);
  if (momo.status === 'fulfilled') results = results.concat(momo.value);
  if (yahoo.status === 'fulfilled') results = results.concat(yahoo.value);

  // Sort by price ascending
  results.sort((a, b) => a.price - b.price);

  return NextResponse.json({ results });
}
