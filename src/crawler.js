const axios = require('axios');
const { 
  findFriendPage, 
  extractFriendLinks, 
  findJsonLinks, 
  extractLinksFromJson,
  getSiteMetadata,
  SOCIAL_MEDIA_DOMAINS 
} = require('./parser');

class Crawler {
  constructor(options = {}) {
    this.maxDepth = options.depth || 2;
    this.concurrency = options.concurrency || 5;
    this.visited = new Set();
    this.nodes = new Map(); // url -> { id, label }
    this.edges = []; // [{ from, to }]
    this.queue = []; // [{ url, depth }]
  }

  async fetchHtml(url) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch ${url}: ${error.message}`);
      return null;
    }
  }

  async fetchJson(url) {
    try {
      const response = await axios.get(url, { timeout: 10000 });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async crawl(startUrl) {
    let startOrigin;
    try {
      startOrigin = new URL(startUrl).origin;
      this.queue.push({ url: startUrl, depth: 0, nodeOrigin: startOrigin });
      this.addNode(startOrigin);
    } catch (e) {
      console.error(`Invalid start URL: ${startUrl}`);
      return;
    }

    while (this.queue.length > 0) {
      const { url, depth, nodeOrigin } = this.queue.shift();

      if (depth >= this.maxDepth || this.visited.has(url)) {
        continue;
      }

      console.log(`Crawling [Depth ${depth}]: ${url}`);
      this.visited.add(url);

      const homeHtml = await this.fetchHtml(url);
      if (!homeHtml) continue;

      // Update the node representing this blog with actual site metadata
      const meta = getSiteMetadata(homeHtml);
      const node = this.nodes.get(nodeOrigin);
      if (node) {
        node.label = meta.title;
        node.title = `${meta.title}\n${meta.description}`;
      }

      let friendPageUrl = findFriendPage(homeHtml, url);
      
      // If we are already on a page that didn't yield a separate friend page link, 
      // or if the found link is same as current, use current.
      if (!friendPageUrl) {
          friendPageUrl = url; 
      }

      console.log(`  Found friend page: ${friendPageUrl}`);

      const friendHtml = (friendPageUrl === url) ? homeHtml : await this.fetchHtml(friendPageUrl);
      if (!friendHtml) continue;

      let links = extractFriendLinks(friendHtml, friendPageUrl);
      
      const jsonUrls = findJsonLinks(friendHtml, friendPageUrl);
      for (const jsonUrl of jsonUrls) {
        console.log(`  Checking JSON data: ${jsonUrl}`);
        const jsonData = await this.fetchJson(jsonUrl);
        if (jsonData) {
          const jsonLinks = extractLinksFromJson(jsonData);
          links = [...new Set([...links, ...jsonLinks])];
        }
      }

      console.log(`  Extracted ${links.length} links`);

      const baseDomain = new URL(nodeOrigin).hostname;

      for (const link of links) {
        try {
          const linkOrigin = new URL(link).origin;
          const linkDomain = new URL(linkOrigin).hostname;

          if (
            linkDomain !== baseDomain &&
            !SOCIAL_MEDIA_DOMAINS.some(domain => linkDomain.endsWith(domain))
          ) {
            this.addNode(linkOrigin);
            this.addEdge(nodeOrigin, linkOrigin);

            if (!this.visited.has(linkOrigin) && depth + 1 < this.maxDepth) {
              this.queue.push({ url: linkOrigin, depth: depth + 1, nodeOrigin: linkOrigin });
            }
          }
        } catch (e) {}
      }
    }

    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges
    };
  }

  addNode(url) {
    if (!this.nodes.has(url)) {
      this.nodes.set(url, { id: url, label: url });
    }
  }

  addEdge(from, to) {
    // Avoid duplicate edges
    const exists = this.edges.some(e => e.from === from && e.to === to);
    if (!exists) {
      this.edges.push({ from, to });
    }
  }
}

module.exports = Crawler;
