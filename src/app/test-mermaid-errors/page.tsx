'use client';

import MarkdownPreview from '@/components/MarkdownPreview';

const mermaidErrorTestContent = `# Mermaid 错误处理测试

这个页面展示了常见的 Mermaid 语法错误和正确的修复方法。

## 常见错误示例

### 1. 节点标签括号不匹配

**错误的语法：**
\`\`\`mermaid
graph TD
    A1[(1) FROM] --> A2[(2) O
    A2 --> A3[结束]
\`\`\`

**正确的语法：**
\`\`\`mermaid
graph TD
    A1[("(1) FROM")] --> A2[("(2) O")]
    A2 --> A3[结束]
\`\`\`

### 2. 特殊字符处理

**错误的语法：**
\`\`\`mermaid
graph TD
    A[用户输入] --> B{验证 & 检查}
    B -->|成功| C[显示结果]
\`\`\`

**正确的语法：**
\`\`\`mermaid
graph TD
    A[用户输入] --> B{"验证 & 检查"}
    B -->|成功| C[显示结果]
\`\`\`

### 3. 中文标签处理

**推荐的语法：**
\`\`\`mermaid
graph TD
    A["开始"] --> B{"是否登录?"}
    B -->|是| C["显示主页"]
    B -->|否| D["跳转登录页"]
    D --> E["用户登录"]
    E --> F{"登录成功?"}
    F -->|是| C
    F -->|否| G["显示错误信息"]
    G --> D
    C --> H["结束"]
\`\`\`

### 4. 时序图语法

**正确的时序图：**
\`\`\`mermaid
sequenceDiagram
    participant 用户
    participant 前端
    participant 后端
    participant 数据库

    用户->>前端: 点击登录按钮
    前端->>后端: 发送登录请求
    后端->>数据库: 验证用户信息
    数据库-->>后端: 返回验证结果
    后端-->>前端: 返回登录状态
    前端-->>用户: 显示登录结果
\`\`\`

### 5. 甘特图语法

**正确的甘特图：**
\`\`\`mermaid
gantt
    title 项目开发计划
    dateFormat  YYYY-MM-DD
    section 需求分析
    需求收集           :done,    des1, 2024-01-01,2024-01-07
    需求分析           :done,    des2, 2024-01-08, 3d
    section 设计阶段
    系统设计           :active,  des3, 2024-01-11, 5d
    数据库设计         :         des4, after des3, 3d
    section 开发阶段
    前端开发           :         des5, after des4, 10d
    后端开发           :         des6, after des4, 10d
    测试               :         des7, after des5, 5d
\`\`\`

## 语法检查清单

在编写 Mermaid 图表时，请检查：

1. ✅ 节点标签的括号是否匹配
2. ✅ 箭头语法是否正确 (--> 或 ---)
3. ✅ 特殊字符是否用引号包围
4. ✅ 流程图语法是否正确 (graph TD 或 flowchart TD)
5. ✅ 中文字符是否用引号包围
6. ✅ 条件判断节点使用花括号 {}
7. ✅ 子图语法是否正确

## 调试技巧

如果遇到解析错误：

1. 检查错误信息中提到的行号
2. 查看原始代码中的语法问题
3. 参考上面的正确示例
4. 使用在线 Mermaid 编辑器验证语法
5. 逐步简化复杂图表进行调试
`;

export default function TestMermaidErrorsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">Mermaid 错误处理测试</h1>
        
        <div className="prose prose-lg max-w-none">
          <MarkdownPreview content={mermaidErrorTestContent} />
        </div>
      </div>
    </div>
  );
}
