const { program } = require('commander');
const Crawler = require('./crawler');
const { generateHtml } = require('./graph');
const path = require('path');

program
  .version('1.0.0')
  .description('Blog Friend Link Crawler & Graph Generator')
  .requiredOption('-u, --url <url>', 'Starting blog URL')
  .option('-d, --depth <number>', 'Crawling depth', (val) => parseInt(val, 10), 3)
  .option('-o, --output <path>', 'Output HTML file path', 'output/graph.html')
  .parse(process.argv);

const options = program.opts();

async function main() {
  console.log(`Starting crawler for: ${options.url} (depth: ${options.depth})`);
  
  const crawler = new Crawler({ depth: options.depth });
  const data = await crawler.crawl(options.url);

  if (data && data.nodes.length > 0) {
    const outputPath = path.resolve(process.cwd(), options.output);
    generateHtml(data, outputPath);
    
    // Generate pruned graph (remove leaf nodes)
    const nodeDegrees = new Map();
    data.nodes.forEach(node => nodeDegrees.set(node.id, 0));
    data.edges.forEach(edge => {
      nodeDegrees.set(edge.from, (nodeDegrees.get(edge.from) || 0) + 1);
      nodeDegrees.set(edge.to, (nodeDegrees.get(edge.to) || 0) + 1);
    });

    const prunedNodes = data.nodes.filter(node => nodeDegrees.get(node.id) > 1);
    const prunedNodeIds = new Set(prunedNodes.map(n => n.id));
    const prunedEdges = data.edges.filter(edge => prunedNodeIds.has(edge.from) && prunedNodeIds.has(edge.to));

    const prunedData = { nodes: prunedNodes, edges: prunedEdges };
    const prunedOutputPath = outputPath.replace('.html', '_pruned.html');
    generateHtml(prunedData, prunedOutputPath);
    
    console.log(`Full graph: ${outputPath}`);
    console.log(`Pruned graph (no leaf nodes): ${prunedOutputPath}`);
    console.log('Done!');
  } else {
    console.log('No links found or crawling failed.');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
