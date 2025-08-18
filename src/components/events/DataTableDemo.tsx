"use client"

import { EventsDataTable } from "./EventsDataTable"
import { EventItem } from "./columns"

// 模拟数据
const mockEvents: EventItem[] = [
  {
    _id: "1",
    title: "项目启动会议",
    description: "讨论新项目的启动计划和团队分工",
    tags: ["会议", "项目"],
    status: "done",
    occurredAt: "2024-01-15T09:00:00.000Z",
    creator: {
      _id: "user1",
      name: "张三",
      email: "zhangsan@example.com"
    }
  },
  {
    _id: "2",
    title: "产品设计评审",
    description: "评审新产品的UI/UX设计方案",
    tags: ["设计", "评审"],
    status: "in-progress",
    occurredAt: "2024-01-16T14:30:00.000Z",
    creator: {
      _id: "user2",
      name: "李四",
      email: "lisi@example.com"
    }
  },
  {
    _id: "3",
    title: "代码审查",
    description: "审查核心功能模块的代码实现",
    tags: ["开发", "代码"],
    status: "planned",
    occurredAt: "2024-01-17T10:00:00.000Z",
    creator: {
      _id: "user3",
      name: "王五",
      email: "wangwu@example.com"
    }
  },
  {
    _id: "4",
    title: "用户测试",
    description: "进行用户界面和功能测试",
    tags: ["测试", "用户"],
    status: "planned",
    occurredAt: "2024-01-18T15:00:00.000Z",
    creator: {
      _id: "user1",
      name: "张三",
      email: "zhangsan@example.com"
    }
  },
  {
    _id: "5",
    title: "部署上线",
    description: "将应用部署到生产环境",
    tags: ["部署", "上线"],
    status: "canceled",
    occurredAt: "2024-01-19T20:00:00.000Z",
    creator: {
      _id: "user2",
      name: "李四",
      email: "lisi@example.com"
    }
  }
]

export function DataTableDemo() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">事件数据表格演示</h2>
      <div className="space-y-4">
        <div className="bg-muted p-4 rounded-lg">
          <h3 className="font-semibold mb-2">功能特性：</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>✅ 支持按标题搜索事件</li>
            <li>✅ 支持按时间列排序</li>
            <li>✅ 支持分页显示（每页10条）</li>
            <li>✅ 支持列显示/隐藏切换</li>
            <li>✅ 支持行操作菜单</li>
            <li>✅ 响应式设计</li>
          </ul>
        </div>
        <EventsDataTable events={mockEvents} />
      </div>
    </div>
  )
}
