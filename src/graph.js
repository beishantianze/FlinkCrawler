const fs = require('fs');
const path = require('path');

function generateHtml(data, outputPath) {
  const template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blog Friend Link Graph</title>
    <script type="text/javascript" src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
    <style type="text/css">
        body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            font-family: sans-serif;
        }
        #network {
            width: 100%;
            height: 100vh;
            background-color: #f5f5f5;
        }
        #info {
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(255, 255, 255, 0.8);
            padding: 10px;
            border-radius: 5px;
            z-index: 100;
        }
        .vis-tooltip {
            position: absolute;
            visibility: hidden;
            padding: 10px;
            white-space: pre-wrap;
            font-family: verdana;
            font-size: 12px;
            color: #000000;
            background-color: #f5f4ed;
            -moz-border-radius: 3px;
            -webkit-border-radius: 3px;
            border-radius: 3px;
            border: 1px solid #808074;
            box-shadow: 3px 3px 10px rgba(0, 0, 0, 0.2);
            max-width: 300px;
            z-index: 1000;
        }
    </style>
</head>
<body>
    <div id="info">
        <h3>Blog Friend Link Graph</h3>
        <p>Nodes: <span id="node-count">0</span> | Edges: <span id="edge-count">0</span></p>
        <p><small>Hover for summary, <b>Double-click</b> to visit website.</small></p>
    </div>
    <div id="network"></div>

    <script type="text/javascript">
        const data = ${JSON.stringify(data)};

        // Relationship-based Clustering (Label Propagation Algorithm)
        function clusterByRelationships(nodes, edges) {
            const adj = {};
            nodes.forEach(n => adj[n.id] = new Set());
            edges.forEach(e => {
                if (adj[e.from] && adj[e.to]) {
                    adj[e.from].add(e.to);
                    adj[e.to].add(e.from); // Treat as undirected for community detection
                }
            });

            // Initialize labels
            let labels = {};
            nodes.forEach((n, i) => labels[n.id] = i);

            // Iterate LPA
            const iterations = 10;
            for (let i = 0; i < iterations; i++) {
                let newLabels = { ...labels };
                let changed = false;
                
                // Shuffle nodes for better convergence
                const shuffledIds = nodes.map(n => n.id).sort(() => Math.random() - 0.5);
                
                shuffledIds.forEach(id => {
                    const neighbors = adj[id];
                    if (neighbors.size === 0) return;

                    const counts = {};
                    neighbors.forEach(neighId => {
                        const lab = labels[neighId];
                        counts[lab] = (counts[lab] || 0) + 1;
                    });

                    // Find max frequency label
                    let maxFreq = 0;
                    let bestLabels = [];
                    for (let lab in counts) {
                        if (counts[lab] > maxFreq) {
                            maxFreq = counts[lab];
                            bestLabels = [lab];
                        } else if (counts[lab] === maxFreq) {
                            bestLabels.push(lab);
                        }
                    }
                    
                    const chosenLabel = parseInt(bestLabels[Math.floor(Math.random() * bestLabels.length)]);
                    if (newLabels[id] !== chosenLabel) {
                        newLabels[id] = chosenLabel;
                        changed = true;
                    }
                });
                labels = newLabels;
                if (!changed) break;
            }

            // Map final labels to small group numbers for Vis.js
            const labelMap = {};
            let groupNext = 0;
            nodes.forEach(n => {
                const l = labels[n.id];
                if (labelMap[l] === undefined) labelMap[l] = groupNext++;
                n.group = labelMap[l];
            });
        }

        clusterByRelationships(data.nodes, data.edges);
        
        document.getElementById('node-count').innerText = data.nodes.length;
        document.getElementById('edge-count').innerText = data.edges.length;

        const container = document.getElementById('network');
        const options = {
            nodes: {
                shape: 'dot',
                size: 20,
                font: { size: 14, color: '#333' },
                borderWidth: 2,
                shadow: true
            },
            edges: {
                width: 1,
                arrows: { to: { enabled: true, scaleFactor: 0.5 } },
                color: { opacity: 0.4 },
                smooth: { type: 'continuous' }
            },
            physics: {
                barnesHut: {
                    gravitationalConstant: -2000,
                    centralGravity: 0.3,
                    springLength: 95,
                    springConstant: 0.04,
                    damping: 0.09,
                    avoidOverlap: 0.1
                },
                stabilization: { iterations: 100 }
            },
            interaction: {
                hover: true,
                tooltipDelay: 300
            }
        };

        const network = new vis.Network(container, data, options);

        // Visit website on double click
        network.on("doubleClick", function (params) {
            if (params.nodes.length > 0) {
                const url = params.nodes[0];
                window.open(url, '_blank');
            }
        });
    </script>
</body>
</html>
  `;

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, template);
  console.log(`Graph generated successfully at: ${outputPath}`);
}

module.exports = { generateHtml };
