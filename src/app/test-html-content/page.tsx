'use client';

import React from 'react';
import MarkdownPreview from '@/components/MarkdownPreview';

export default function TestHtmlContentPage() {
  const testContent = `# HTML内容测试页面

这个页面用于测试Markdown组件是否能正确解析和显示HTML内容。

## 测试用例1: 感谢作者样式

<div style="text-align: center; margin: 20px 0; padding: 15px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-radius: 8px; border-left: 4px solid #4A90E2;">
  <p style="margin: 0; font-size: 16px; color: #2c3e50; font-weight: 500;">
    <svg style="color: #e74c3c; margin-right: 8px; width: 16px; height: 16px; display: inline-block; vertical-align: middle;" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
    感谢初稿作者：
    <span style="color: #3498db; font-weight: 600;">郝新明</span>
  </p>
</div>

## 测试用例2: 基本HTML标签

这是一个包含 <strong>粗体文本</strong> 和 <em>斜体文本</em> 的段落。

<div style="background-color: #f8f9fa; padding: 10px; border-radius: 5px;">
  这是一个带有背景色的div容器。
</div>

## 测试用例3: 内联样式

<span style="color: red; font-weight: bold;">红色粗体文本</span>

<p style="background: #e8f5e8; padding: 10px; border-left: 3px solid #4caf50;">
  这是一个带有绿色左边框和背景的段落。
</p>

## 测试用例4: 复杂嵌套结构

<div style="border: 2px solid #007bff; border-radius: 10px; padding: 20px; margin: 20px 0;">
  <h3 style="color: #007bff; margin-top: 0;">信息框标题</h3>
  <p style="margin: 10px 0;">这是信息框内的内容。</p>
  <div style="background: #f1f8ff; padding: 10px; border-radius: 5px;">
    <span style="font-weight: bold;">重要提示：</span>
    <span style="color: #666;">这是一个嵌套的内容区域。</span>
  </div>
</div>

## 普通Markdown内容

这是普通的Markdown内容，应该正常显示：

- 列表项1
- 列表项2
- 列表项3

\`\`\`javascript
// 这是代码块
function test() {
  console.log("Hello World");
}
\`\`\`

**粗体文本** 和 *斜体文本* 以及 [链接](https://example.com)。

> 这是一个引用块
> 包含多行内容

---

如果上面的HTML内容能够正确显示样式，说明HTML解析功能正常工作。`;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-background rounded-lg shadow-sm border border-border p-6">
        <MarkdownPreview content={testContent} />
      </div>
      
      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h2 className="text-lg font-semibold mb-2">测试说明</h2>
        <p className="text-sm text-muted-foreground">
          如果您看到上面的HTML内容显示了正确的样式（如彩色背景、边框、字体颜色等），
          说明HTML解析功能已经正常工作。如果只看到纯文本，说明HTML标签被过滤了。
        </p>
      </div>
    </div>
  );
}
