'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Save, Loader2, Search, Filter } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface SystemParameter {
  _id?: string;
  id: string;
  key: string;
  name: string;
  description: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'array' | 'select';
  category: string;
  options?: string[];
  min?: number;
  max?: number;
  unit?: string;
  isRequired?: boolean;
  isEditable?: boolean;
  defaultValue?: any;
  createdAt?: string;
  updatedAt?: string;
}

interface SystemSettings {
  siteName: string;
  siteDescription: string;
  siteKeywords: string;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  maxPostsPerDay: number;
  maxTagsPerPost: number;
  autoCloseQuestions: boolean;
  autoCloseAfterDays: number;
  enableNotifications: boolean;
  enableEmailNotifications: boolean;
  moderationMode: 'auto' | 'manual' | 'disabled';
  spamFilterEnabled: boolean;
  maintenanceMode: boolean;
  maxFileSize: number;
  allowedFileTypes: string[];
  enableComments: boolean;
  enableLikes: boolean;
  enableViews: boolean;
}

export default function ParameterConfig() {
  const [parameters, setParameters] = useState<SystemParameter[]>([]);
  const [filteredParameters, setFilteredParameters] = useState<SystemParameter[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    siteName: 'PonyMind',
    siteDescription: '技术问答与知识分享的专业平台',
    siteKeywords: '技术,问答,知识分享,编程,开发',
    allowRegistration: true,
    requireEmailVerification: false,
    maxPostsPerDay: 10,
    maxTagsPerPost: 5,
    autoCloseQuestions: false,
    autoCloseAfterDays: 30,
    enableNotifications: true,
    enableEmailNotifications: true,
    moderationMode: 'auto',
    spamFilterEnabled: true,
    maintenanceMode: false,
    maxFileSize: 5,
    allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
    enableComments: true,
    enableLikes: true,
    enableViews: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    // 从数据库加载参数
    const loadParameters = async () => {
      try {
        const response = await fetch('/api/admin/system-parameters');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setParameters(data.parameters);
            setFilteredParameters(data.parameters);
          } else {
            // 如果数据库中没有参数，则初始化
            const initResponse = await fetch('/api/admin/system-parameters', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ action: 'init' }),
            });
            
            if (initResponse.ok) {
              const initData = await initResponse.json();
              if (initData.success) {
                setParameters(initData.parameters);
                setFilteredParameters(initData.parameters);
              }
            }
          }
        }
      } catch (error) {
        console.error('加载参数失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadParameters();
  }, []);

  // 搜索和筛选参数
  useEffect(() => {
    let filtered = parameters;

    // 按分类筛选
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(param => param.category === selectedCategory);
    }

    // 按搜索词筛选
    if (searchTerm) {
      filtered = filtered.filter(param => 
        param.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        param.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        param.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (param.key && param.key.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredParameters(filtered);
  }, [parameters, searchTerm, selectedCategory]);

  const handleParameterChange = (paramKey: string, value: any) => {
    setParameters(prev => 
      prev.map(param => 
        (param.id === paramKey || param.key === paramKey) ? { ...param, value } : param
      )
    );

    // 同步更新settings状态
    setSettings(prev => ({
      ...prev,
      [paramKey]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 准备要保存的参数数据
      const parametersToSave = parameters.map(param => ({
        key: param.key || param.id,
        value: param.value
      }));

      const response = await fetch('/api/admin/system-parameters', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ parameters: parametersToSave }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // 更新本地参数列表
          setParameters(data.parameters);
          setFilteredParameters(data.parameters);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        } else {
          alert('保存失败: ' + data.error);
        }
      } else {
        alert('保存失败');
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('确定要重置所有参数到默认值吗？此操作不可恢复。')) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/system-parameters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'reset' }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // 更新本地参数列表
          setParameters(data.parameters);
          setFilteredParameters(data.parameters);
          alert('参数重置成功');
        } else {
          alert('重置失败: ' + data.error);
        }
      } else {
        alert('重置失败');
      }
    } catch (error) {
      console.error('重置参数失败:', error);
      alert('重置失败');
    } finally {
      setSaving(false);
    }
  };

  const renderParameterInput = (param: SystemParameter) => {
    switch (param.type) {
      case 'boolean':
        return (
          <Switch
            checked={param.value}
            onCheckedChange={(checked) => handleParameterChange(param.key || param.id, checked)}
          />
        );
      
      case 'number':
        return (
          <div className="flex items-center space-x-2">
            <Input
              type="number"
              value={param.value}
              onChange={(e) => handleParameterChange(param.key || param.id, parseInt(e.target.value) || 0)}
              min={param.min}
              max={param.max}
              className="w-24"
            />
            {param.unit && <span className="text-sm text-muted-foreground">{param.unit}</span>}
          </div>
        );
      
      case 'select':
        return (
          <Select value={param.value} onValueChange={(value) => handleParameterChange(param.key || param.id, value)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {param.options?.map(option => (
                <SelectItem key={option} value={option}>
                  {option === 'auto' ? '自动审核' : 
                   option === 'manual' ? '人工审核' : 
                   option === 'disabled' ? '关闭审核' : option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'array':
        return (
          <Textarea
            value={param.value}
            onChange={(e) => handleParameterChange(param.key || param.id, e.target.value)}
            placeholder="用逗号分隔多个值"
            className="w-64"
            rows={2}
          />
        );
      
      default:
        return (
          <Input
            type="text"
            value={param.value}
            onChange={(e) => handleParameterChange(param.key || param.id, e.target.value)}
            className="w-64"
          />
        );
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case '基本设置': return '⚙️';
      case '用户设置': return '👥';
      case '内容设置': return '📝';
      case '通知设置': return '🔔';
      case '安全设置': return '🔒';
      case '系统设置': return '💻';
      case '性能设置': return '🚀';
      default: return '⚙️';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case '基本设置': return 'bg-blue-100 text-blue-800';
      case '用户设置': return 'bg-green-100 text-green-800';
      case '内容设置': return 'bg-purple-100 text-purple-800';
      case '通知设置': return 'bg-yellow-100 text-yellow-800';
      case '安全设置': return 'bg-red-100 text-red-800';
      case '系统设置': return 'bg-gray-100 text-gray-800';
      case '性能设置': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const categories = Array.from(new Set(parameters.map(p => p.category)));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">正在加载参数配置...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">参数配置</h1>
          <p className="text-gray-600 mt-2">配置系统的各项参数和功能开关</p>
        </div>
        <div className="flex space-x-3">
          {saved && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>参数已保存</AlertDescription>
            </Alert>
          )}
                      <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  保存配置
                </>
              )}
            </Button>
            <Button 
              onClick={handleReset} 
              variant="outline"
              disabled={saving}
            >
              重置默认值
            </Button>
        </div>
      </div>

             {/* 搜索和筛选 */}
       <Card>
         <CardHeader>
           <CardTitle className="text-lg">搜索和筛选</CardTitle>
           <CardDescription>快速查找和筛选系统参数</CardDescription>
         </CardHeader>
         <CardContent>
           <div className="flex flex-col sm:flex-row gap-4">
             <div className="flex-1">
               <Label htmlFor="search" className="text-sm font-medium mb-2 block">搜索参数</Label>
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                   <Input
                    id="search"
                    placeholder="搜索参数名称、描述、ID或键名..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
             <div className="flex flex-col space-y-2">
               <Label className="text-sm font-medium">分类筛选</Label>
               <div className="flex items-center space-x-2">
                 <Filter className="h-4 w-4 text-muted-foreground" />
                 <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                   <SelectTrigger className="w-48">
                     <SelectValue placeholder="选择分类" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="all">所有分类</SelectItem>
                     {categories.map(category => (
                       <SelectItem key={category} value={category}>
                         {getCategoryIcon(category)} {category}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
                </div>
              </div>
            </div>
           <div className="mt-4 flex items-center justify-between">
             <div className="text-sm text-muted-foreground">
               共找到 <span className="font-medium text-foreground">{filteredParameters.length}</span> 个参数
                </div>
             <div className="text-sm text-muted-foreground">
               总计 <span className="font-medium text-foreground">{parameters.length}</span> 个参数
                </div>
              </div>
         </CardContent>
       </Card>

      {/* 参数配置表格 */}
      <Card>
        <CardHeader>
          <CardTitle>系统参数配置</CardTitle>
          <CardDescription>
            所有系统参数配置，支持搜索和分类筛选
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
                         <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead className="w-36">参数ID</TableHead>
                   <TableHead className="w-32">分类</TableHead>
                   <TableHead className="w-40">参数名称</TableHead>
                   <TableHead className="min-w-0">描述</TableHead>
                   <TableHead className="w-52">参数值</TableHead>
                 </TableRow>
               </TableHeader>
              <TableBody>
                {filteredParameters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      没有找到匹配的参数
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParameters.map((param) => (
                    <TableRow key={param._id || param.id || param.key}>
                                             <TableCell>
                         <Badge variant="outline" className="font-mono text-xs">
                           {param.key || param.id}
                         </Badge>
                       </TableCell>
                      <TableCell>
                        <Badge className={`${getCategoryColor(param.category)} text-xs`}>
                          {getCategoryIcon(param.category)} {param.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{param.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground max-w-md">
                          {param.description}
              </div>
                      </TableCell>
                                             <TableCell className="py-3">
                         <div className="flex items-center justify-center">
                           {renderParameterInput(param)}
            </div>
                       </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
                  </div>
        </CardContent>
      </Card>

      {/* 保存提示 */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          修改参数后请点击"保存配置"按钮以应用更改。某些参数可能需要重启服务才能生效。
        </AlertDescription>
      </Alert>
    </div>
    );
} 