import connectDB from './mongodb';
import Message from '@/models/Message';

export async function createMessage(
  recipientId: string,
  type: string,
  title: string,
  content: string,
  options: {
    senderId?: string;
    relatedId?: string;
    relatedType?: string;
    priority?: string;
  } = {}
) {
  try {
    await connectDB();

    const message = new Message({
      recipient: recipientId,
      sender: options.senderId || null,
      type,
      title,
      content,
      relatedId: options.relatedId || null,
      relatedType: options.relatedType || null,
      priority: options.priority || 'normal',
    });

    await message.save();
    return message;
  } catch (error) {
    console.error('创建消息失败:', error);
    throw error;
  }
}
