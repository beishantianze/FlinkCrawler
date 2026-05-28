# FlinkCrawler

一个功能强大的博客友链爬虫及交互式有向图生成器。

## 功能特点

1.  **智能识别:** 自动寻找博客主页中的友链页面链接（支持“友链”、“Friends”、“Links”等关键字）。
2.  **JSON 深度抓取:** 支持解析常见的 Hexo 主题（如 Volantis, Butterfly）使用的外部 JSON 友链配置文件。
3.  **关系网聚类 (LPA):** 使用标签传播算法（Label Propagation Algorithm）根据博客间的实际链接关系进行社区发现和自动着色。
4.  **交互式可视化:** 生成基于 Vis.js 的 HTML 页面，支持：
    *   **缩放与拖拽:** 自由探索关系网。
    *   **悬停预览:** 鼠标悬停显示网站标题和摘要。
    *   **双击访问:** 双击节点直接在浏览器新标签页打开对应博客。
5.  **自动修剪:** 提供 `graph_pruned.html`，自动删除边缘叶子节点，聚焦核心互联圈子。
6.  **严格过滤:** 自动排除 X.com, cnblogs, csdn, wordpress 等非独立博客域名及各种 CDN/图床链接。

## 快速开始

### 安装依赖
```bash
npm install
```

### 运行爬虫
```bash
# 基本用法 (默认深度为 3)
node src/index.js --url https://gendo.dpdns.org

# 指定深度和输出
node src/index.js --url https://example.com --depth 2 --output my_blog_graph.html
```

### 查看结果
在浏览器中打开 `output/graph_pruned.html` 即可查看聚类后的核心博友圈。

## 开发

- `src/index.js`: CLI 入口
- `src/crawler.js`: 爬虫引擎 (BFS)
- `src/parser.js`: HTML/JSON 解析与过滤逻辑
- `src/graph.js`: 交互式 HTML 模板生成
