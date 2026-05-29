const cheerio = require('cheerio');
const { URL } = require('url');

const FRIEND_KEYWORDS = ['友链', '朋友', '邻居', '小伙伴', 'Friends', 'Links', 'Links', '友情链接', '邻居们'];
const SOCIAL_MEDIA_DOMAINS = [
  'github.com', 'twitter.com', 'facebook.com', 'zhihu.com', 'weibo.com', 'juejin.cn',
  'csdn.net', 'bilibili.com', 'youtube.com', 'instagram.com', 'linkedin.com', 'medium.com',
  'music.163.com', 'steamcommunity.com', 'creativecommons.org', 'coolapk.com', 'sspai.com',
  'jike.com', 'apple.com', 'google.com', 'microsoft.com', 'baidu.com', 'tencent.com',
  'hexo.io', 'qq.com', 't.me', 'x.com', 's.ee', 't.co', 'bit.ly', 'goo.gl', 'shrtco.de',
  'githubusercontent.com', 'jsdelivr.net', 'loli.net', 'aliyuncs.com', 'qiniucdn.com',
  'wp.com', 'gravatar.com', 'disqus.com', 'valine.js.org', 'leancloud.cn', 'douban.com',
  'pixiv.net', 'v2ex.com', 'reddit.com', 'telegram.org', 'discord.gg', 'astro.build',
  'cnblogs.com', 'csdn.net', 'jianshu.com', 'gitbook.io', 'wordpress.com', 'wordpress.org', 'icp.gov.moe'
];

/**
 * Validates if a URL is likely a real personal blog/site.
 */
function isPotentialBlog(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // 1. Exclude if domain is too short (e.g., x.com, s.ee) - usually social or shorteners
    const parts = hostname.split('.');
    const mainDomain = parts.length >= 2 ? parts[parts.length - 2] : '';
    // Most legitimate domains are at least 3 chars, or they are recognized suffixes
    if (mainDomain.length <= 2 && parts.length <= 2) return false;

    // 2. Check against expanded blacklist
    if (SOCIAL_MEDIA_DOMAINS.some(domain => hostname.endsWith(domain))) {
      return false;
    }

    // 3. Exclude common static/CDN/tracking subdomains
    const noiseKeywords = ['cdn', 'img', 'static', 'assets', 'api', 'upload', 'image', 'avatar', 'track', 'analytics'];
    if (noiseKeywords.some(kw => hostname.includes(kw))) {
      return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Extracts site title and description for summary.
 */
function getSiteMetadata(html) {
  const $ = cheerio.load(html);
  const title = $('title').text().trim() || 'No Title';
  const description = $('meta[name="description"]').attr('content') || 
                      $('meta[property="og:description"]').attr('content') || 
                      'No Description';
  return { title, description };
}

/**
 * Heuristically finds the friend link page from a home page HTML.
 */
function findFriendPage(html, baseUrl) {
  const $ = cheerio.load(html);
  let friendUrl = null;

  $('a').each((i, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr('href');
    if (!href) return;

    if (FRIEND_KEYWORDS.some(kw => text.includes(kw))) {
      try {
        const urlObj = new URL(href, baseUrl);
        if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
          friendUrl = urlObj.href;
          return false; // break loop
        }
      } catch (e) {
        // invalid URL
      }
    }
  });

  return friendUrl;
}

/**
 * Heuristically finds potential JSON API endpoints for friend links in the HTML or script tags.
 */
function findJsonLinks(html, baseUrl) {
  const jsonPatterns = [/links?\.json/i, /friends?\.json/i];
  const foundJsons = [];
  
  const scriptContent = html.match(/['"][^'"]+\.json['"]/g) || [];
  scriptContent.forEach(match => {
    const path = match.slice(1, -1);
    if (jsonPatterns.some(p => p.test(path))) {
      try {
        foundJsons.push(new URL(path, baseUrl).href);
      } catch (e) {}
    }
  });

  return [...new Set(foundJsons)];
}

/**
 * Extracts links from a JSON object.
 */
function extractLinksFromJson(json) {
  const links = new Set();
  const jsonStr = JSON.stringify(json);
  
  const urlRegex = /https?:\/\/[^\s'"]+/g;
  let match;
  while ((match = urlRegex.exec(jsonStr)) !== null) {
    try {
      const urlObj = new URL(match[0]);
      const origin = urlObj.origin;
      if (isPotentialBlog(origin)) {
        links.add(origin);
      }
    } catch (e) {}
  }
  return Array.from(links);
}

/**
 * Extracts external links from a friend link page.
 */
function extractFriendLinks(html, baseUrl) {
  const $ = cheerio.load(html);
  const baseDomain = new URL(baseUrl).hostname;
  const links = new Set();

  $('a').each((i, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    try {
      const urlObj = new URL(href, baseUrl);
      const targetDomain = urlObj.hostname;

      if (
        (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') &&
        targetDomain !== baseDomain &&
        isPotentialBlog(urlObj.origin)
      ) {
        links.add(urlObj.origin);
      }
    } catch (e) {}
  });

  return Array.from(links);
}

module.exports = {
  findFriendPage,
  extractFriendLinks,
  findJsonLinks,
  extractLinksFromJson,
  getSiteMetadata,
  SOCIAL_MEDIA_DOMAINS
};
