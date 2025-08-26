import Tag from '@/models/Tag';
import Post from '@/models/Post';
import Event from '@/models/Event';

/**
 * 更新标签的文章和事件计数
 * @param tagNames 标签名称数组
 */
export async function updateTagCounts(tagNames: string[]) {
  if (!Array.isArray(tagNames) || tagNames.length === 0) {
    return;
  }

  try {
    // 去重标签名称
    const uniqueTags = [...new Set(tagNames)];
    
    // 批量更新标签计数
    for (const tagName of uniqueTags) {
      const [postCount, eventCount] = await Promise.all([
        Post.countDocuments({ 
          tags: tagName,
          status: { $ne: 'deleted' }
        }),
        Event.countDocuments({ tags: tagName })
      ]);

      // 更新标签计数
      await Tag.findOneAndUpdate(
        { name: tagName },
        { 
          postCount,
          eventCount,
          updatedAt: new Date()
        },
        { upsert: false } // 不创建新标签，只更新现有标签
      );
    }
  } catch (error) {
    console.error('更新标签计数失败:', error);
  }
}

/**
 * 更新单个标签的计数
 * @param tagName 标签名称
 */
export async function updateSingleTagCount(tagName: string) {
  if (!tagName || typeof tagName !== 'string') {
    return;
  }

  try {
    const [postCount, eventCount] = await Promise.all([
      Post.countDocuments({ 
        tags: tagName,
        // 统计所有存在的文章，包括草稿、待审核、已发布等
        // Post模型中没有deleted状态，删除的文章已被物理删除
      }),
      Event.countDocuments({ tags: tagName })
    ]);

    await Tag.findOneAndUpdate(
      { name: tagName },
      { 
        postCount,
        eventCount,
        updatedAt: new Date()
      },
      { upsert: false }
    );
  } catch (error) {
    console.error(`更新标签 "${tagName}" 计数失败:`, error);
  }
}

/**
 * 批量更新所有标签的计数
 */
export async function updateAllTagCounts() {
  try {
    const tags = await Tag.find({});
    console.log(`开始更新 ${tags.length} 个标签的计数`);

    for (const tag of tags) {
      await updateSingleTagCount(tag.name);
    }

    console.log('所有标签计数更新完成');
  } catch (error) {
    console.error('批量更新标签计数失败:', error);
  }
}
