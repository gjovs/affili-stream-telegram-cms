import { Bot, Context, InlineKeyboard, webhookCallback } from 'grammy';
import { prisma } from '@/lib/db';
import { scrapeUrl } from '@/lib/scraper';
import { getStoreName } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import { 
  broadcastProduct, 
  broadcastBlogPost, 
  notifyAdmins, 
  getGroups,
  toggleGroupSetting,
  buildProductMessage 
} from '@/lib/telegram-broadcast';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set');

// Support multiple admin IDs (comma-separated)
const ADMIN_TELEGRAM_IDS = process.env.ADMIN_TELEGRAM_IDS?.split(',').map(id => id.trim()) || [];

const bot = new Bot(token);

// Bot session states
enum BotState {
  IDLE = 'IDLE',
  WAITING_PRICE = 'WAITING_PRICE',
  WAITING_ORIGINAL_PRICE = 'WAITING_ORIGINAL_PRICE',
  WAITING_TITLE = 'WAITING_TITLE',
  WAITING_COUPON = 'WAITING_COUPON',
  WAITING_CATEGORY = 'WAITING_CATEGORY',
  WAITING_IMAGE = 'WAITING_IMAGE',
  WAITING_MANUAL_DATA = 'WAITING_MANUAL_DATA',
  // Blog states
  WAITING_BLOG_TITLE = 'WAITING_BLOG_TITLE',
  WAITING_BLOG_CONTENT = 'WAITING_BLOG_CONTENT',
  // Product edit states
  EDITING_PRODUCT_TITLE = 'EDITING_PRODUCT_TITLE',
  EDITING_PRODUCT_PRICE = 'EDITING_PRODUCT_PRICE',
  EDITING_PRODUCT_ORIGINAL_PRICE = 'EDITING_PRODUCT_ORIGINAL_PRICE',
  EDITING_PRODUCT_COUPON = 'EDITING_PRODUCT_COUPON',
}

interface SessionData {
  url?: string;
  title?: string;
  image?: string;
  price?: number;
  originalPrice?: number;
  couponCode?: string;
  storeName?: string;
  category?: string;
  affiliateLink?: string;
  editField?: string;
  // Blog data
  blogTitle?: string;
  blogContent?: string;
  blogSlug?: string;
  // Product edit data
  editingProductId?: string;
}

// Check if user is admin
function isAdmin(ctx: Context): boolean {
  if (ADMIN_TELEGRAM_IDS.length === 0) {
    console.warn('ADMIN_TELEGRAM_IDS not set - bot is open to all users');
    return true;
  }
  const userId = ctx.from?.id?.toString();
  return userId ? ADMIN_TELEGRAM_IDS.includes(userId) : false;
}

// Check if chat is private (not a group)
function isPrivateChat(ctx: Context): boolean {
  return ctx.chat?.type === 'private';
}

// Middleware to check admin access (only for private chats)
async function checkAdmin(ctx: Context, next: () => Promise<void>) {
  // Allow group events (join/leave) to pass through
  if (ctx.myChatMember) {
    await next();
    return;
  }

  // In groups, only respond to specific commands from anyone (for now, just ignore non-admin messages)
  if (!isPrivateChat(ctx)) {
    // Don't respond in groups unless it's a specific allowed action
    return;
  }

  // In private chat, check if user is admin
  if (!isAdmin(ctx)) {
    await ctx.reply(
      '⛔ Acesso negado.\n\n' +
      'Este bot e restrito apenas para administradores.\n' +
      'Se voce e o administrador, verifique se seu ADMIN_TELEGRAM_IDS esta configurado corretamente.'
    );
    return;
  }
  await next();
}

// Apply admin middleware to all updates
bot.use(checkAdmin);

// ==================== GROUP MANAGEMENT ====================

// Handle bot being added to or removed from groups
bot.on('my_chat_member', async (ctx) => {
  const chat = ctx.chat;
  const newStatus = ctx.myChatMember.new_chat_member.status;
  const oldStatus = ctx.myChatMember.old_chat_member.status;

  // Only handle group/supergroup chats
  if (chat.type !== 'group' && chat.type !== 'supergroup') {
    return;
  }

  const chatId = BigInt(chat.id);
  const chatTitle = chat.title || 'Grupo sem nome';

  // Bot was added to group
  if ((oldStatus === 'left' || oldStatus === 'kicked') && 
      (newStatus === 'member' || newStatus === 'administrator')) {
    
    try {
      // Save group to database
      await prisma.telegramGroup.upsert({
        where: { chatId },
        update: { title: chatTitle },
        create: {
          chatId,
          title: chatTitle,
          notifyProducts: true,
          notifyBlog: true,
        },
      });

      console.log(`Bot added to group: ${chatTitle} (${chatId})`);
      
      // Notify admins
      await notifyAdmins(
        `🤖 *Bot adicionado ao grupo!*\n\n` +
        `📱 Grupo: *${chatTitle}*\n` +
        `🆔 ID: \`${chatId}\`\n\n` +
        `_Notificacoes de produtos e blog ativadas._\n` +
        `Use /grupos para gerenciar.`
      );
    } catch (error) {
      console.error('Error saving group:', error);
    }
  }

  // Bot was removed from group
  if ((oldStatus === 'member' || oldStatus === 'administrator') && 
      (newStatus === 'left' || newStatus === 'kicked')) {
    
    try {
      // Remove group from database
      await prisma.telegramGroup.delete({
        where: { chatId },
      }).catch(() => {}); // Ignore if not found

      console.log(`Bot removed from group: ${chatTitle} (${chatId})`);
      
      // Notify admins
      await notifyAdmins(
        `🚫 *Bot removido do grupo!*\n\n` +
        `📱 Grupo: *${chatTitle}*\n` +
        `🆔 ID: \`${chatId}\``
      );
    } catch (error) {
      console.error('Error removing group:', error);
    }
  }
});

// ==================== GROUP COMMANDS ====================

// List all groups
bot.command('grupos', async (ctx) => {
  if (!isPrivateChat(ctx)) {
    await ctx.reply('⚠️ Este comando so funciona no chat privado com o bot.');
    return;
  }

  const groups = await getGroups();

  if (groups.length === 0) {
    await ctx.reply(
      '📭 *Nenhum grupo cadastrado*\n\n' +
      'Adicione o bot a um grupo do Telegram para comecar a enviar notificacoes.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  let message = '📋 *Grupos cadastrados:*\n\n';
  
  groups.forEach((group, index) => {
    const productStatus = group.notifyProducts ? '✅' : '❌';
    const blogStatus = group.notifyBlog ? '✅' : '❌';
    
    message += `*${index + 1}. ${group.title}*\n`;
    message += `   📦 Produtos: ${productStatus}\n`;
    message += `   📝 Blog: ${blogStatus}\n`;
    message += `   🆔 \`${group.chatId}\`\n\n`;
  });

  message += '_Para gerenciar um grupo, use:_\n';
  message += '`/grupo [numero]` (ex: /grupo 1)';

  await ctx.reply(message, { parse_mode: 'Markdown' });
});

// Manage specific group
bot.hears(/^\/grupo\s+(\d+)$/, async (ctx) => {
  if (!isPrivateChat(ctx)) {
    await ctx.reply('⚠️ Este comando so funciona no chat privado com o bot.');
    return;
  }

  const groupIndex = parseInt(ctx.match[1]) - 1;
  const groups = await getGroups();

  if (groupIndex < 0 || groupIndex >= groups.length) {
    await ctx.reply(`❌ Grupo nao encontrado. Use /grupos para ver a lista.`);
    return;
  }

  const group = groups[groupIndex];

  const keyboard = new InlineKeyboard()
    .text(
      group.notifyProducts ? '📦 Produtos: ON' : '📦 Produtos: OFF',
      `toggle_products_${group.chatId}`
    )
    .row()
    .text(
      group.notifyBlog ? '📝 Blog: ON' : '📝 Blog: OFF',
      `toggle_blog_${group.chatId}`
    )
    .row()
    .text('🗑️ Remover grupo', `remove_group_${group.chatId}`);

  await ctx.reply(
    `⚙️ *Configuracoes do grupo*\n\n` +
    `📱 *${group.title}*\n` +
    `🆔 \`${group.chatId}\`\n\n` +
    `Clique nos botoes para alternar as notificacoes:`,
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );
});

// Handle group management callbacks
bot.callbackQuery(/^toggle_products_(-?\d+)$/, async (ctx) => {
  const chatId = BigInt(ctx.match[1]);
  const newValue = await toggleGroupSetting(chatId, 'notifyProducts');
  
  if (newValue === null) {
    await ctx.answerCallbackQuery({ text: 'Grupo nao encontrado!' });
    return;
  }

  const group = await prisma.telegramGroup.findUnique({ where: { chatId } });
  if (!group) return;

  const keyboard = new InlineKeyboard()
    .text(
      group.notifyProducts ? '📦 Produtos: ON' : '📦 Produtos: OFF',
      `toggle_products_${group.chatId}`
    )
    .row()
    .text(
      group.notifyBlog ? '📝 Blog: ON' : '📝 Blog: OFF',
      `toggle_blog_${group.chatId}`
    )
    .row()
    .text('🗑️ Remover grupo', `remove_group_${group.chatId}`);

  await ctx.editMessageReplyMarkup({ reply_markup: keyboard });
  await ctx.answerCallbackQuery({ 
    text: `Produtos: ${newValue ? 'Ativado' : 'Desativado'}` 
  });
});

bot.callbackQuery(/^toggle_blog_(-?\d+)$/, async (ctx) => {
  const chatId = BigInt(ctx.match[1]);
  const newValue = await toggleGroupSetting(chatId, 'notifyBlog');
  
  if (newValue === null) {
    await ctx.answerCallbackQuery({ text: 'Grupo nao encontrado!' });
    return;
  }

  const group = await prisma.telegramGroup.findUnique({ where: { chatId } });
  if (!group) return;

  const keyboard = new InlineKeyboard()
    .text(
      group.notifyProducts ? '📦 Produtos: ON' : '📦 Produtos: OFF',
      `toggle_products_${group.chatId}`
    )
    .row()
    .text(
      group.notifyBlog ? '📝 Blog: ON' : '📝 Blog: OFF',
      `toggle_blog_${group.chatId}`
    )
    .row()
    .text('🗑️ Remover grupo', `remove_group_${group.chatId}`);

  await ctx.editMessageReplyMarkup({ reply_markup: keyboard });
  await ctx.answerCallbackQuery({ 
    text: `Blog: ${newValue ? 'Ativado' : 'Desativado'}` 
  });
});

bot.callbackQuery(/^remove_group_(-?\d+)$/, async (ctx) => {
  const chatId = BigInt(ctx.match[1]);
  
  try {
    const group = await prisma.telegramGroup.delete({
      where: { chatId },
    });
    
    await ctx.editMessageText(
      `🗑️ Grupo removido: *${group.title}*\n\n` +
      `_O bot ainda esta no grupo. Remova-o manualmente se desejar._`,
      { parse_mode: 'Markdown' }
    );
    await ctx.answerCallbackQuery({ text: 'Grupo removido!' });
  } catch {
    await ctx.answerCallbackQuery({ text: 'Erro ao remover grupo!' });
  }
});

// ==================== PRODUCT CRUD ====================

// List products command
bot.command('produtos', async (ctx) => {
  const page = 1;
  await showProductList(ctx, page);
});

// Pagination for products
bot.hears(/^\/produtos_(\d+)$/, async (ctx) => {
  const page = parseInt(ctx.match[1]);
  await showProductList(ctx, page);
});

async function showProductList(ctx: Context, page: number) {
  const perPage = 5;
  const skip = (page - 1) * perPage;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    }),
    prisma.product.count(),
  ]);

  if (products.length === 0 && page === 1) {
    await ctx.reply(
      '📭 *Nenhum produto cadastrado*\n\n' +
      'Envie um link de produto para cadastrar.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const totalPages = Math.ceil(total / perPage);

  let message = `📦 *Produtos cadastrados* (${total} total)\n`;
  message += `Pagina ${page}/${totalPages}\n\n`;

  for (const product of products) {
    const priceStr = `R$ ${product.price.toFixed(2)}`;
    const discount = product.originalPrice 
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) + '% OFF'
      : '';
    
    message += `*${product.title.substring(0, 40)}${product.title.length > 40 ? '...' : ''}*\n`;
    message += `💰 ${priceStr} ${discount ? `🔥 ${discount}` : ''}\n`;
    message += `🏪 ${product.storeName}\n`;
    message += `🆔 \`${product.id}\`\n\n`;
  }

  message += '_Para gerenciar um produto:_\n';
  message += '`/produto [id]`\n\n';

  // Pagination buttons
  const keyboard = new InlineKeyboard();
  
  if (page > 1) {
    keyboard.text('⬅️ Anterior', `prod_page_${page - 1}`);
  }
  if (page < totalPages) {
    keyboard.text('Proximo ➡️', `prod_page_${page + 1}`);
  }

  await ctx.reply(message, { 
    parse_mode: 'Markdown',
    reply_markup: keyboard.row().text('🔄 Atualizar', `prod_page_${page}`)
  });
}

// Product pagination callbacks
bot.callbackQuery(/^prod_page_(\d+)$/, async (ctx) => {
  const page = parseInt(ctx.match[1]);
  
  const perPage = 5;
  const skip = (page - 1) * perPage;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    }),
    prisma.product.count(),
  ]);

  const totalPages = Math.ceil(total / perPage);

  let message = `📦 *Produtos cadastrados* (${total} total)\n`;
  message += `Pagina ${page}/${totalPages}\n\n`;

  for (const product of products) {
    const priceStr = `R$ ${product.price.toFixed(2)}`;
    const discount = product.originalPrice 
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) + '% OFF'
      : '';
    
    message += `*${product.title.substring(0, 40)}${product.title.length > 40 ? '...' : ''}*\n`;
    message += `💰 ${priceStr} ${discount ? `🔥 ${discount}` : ''}\n`;
    message += `🏪 ${product.storeName}\n`;
    message += `🆔 \`${product.id}\`\n\n`;
  }

  message += '_Para gerenciar um produto:_\n';
  message += '`/produto [id]`\n\n';

  const keyboard = new InlineKeyboard();
  
  if (page > 1) {
    keyboard.text('⬅️ Anterior', `prod_page_${page - 1}`);
  }
  if (page < totalPages) {
    keyboard.text('Proximo ➡️', `prod_page_${page + 1}`);
  }

  try {
    await ctx.editMessageText(message, { 
      parse_mode: 'Markdown',
      reply_markup: keyboard.row().text('🔄 Atualizar', `prod_page_${page}`)
    });
  } catch {
    // Message didn't change
  }
  await ctx.answerCallbackQuery();
});

// View/manage single product
bot.hears(/^\/produto\s+(.+)$/, async (ctx) => {
  const productId = ctx.match[1].trim();
  await showProductDetail(ctx, productId);
});

async function showProductDetail(ctx: Context, productId: string, editMessage = false) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    if (editMessage && ctx.callbackQuery) {
      await ctx.answerCallbackQuery({ text: 'Produto nao encontrado!' });
    } else {
      await ctx.reply('❌ Produto nao encontrado. Verifique o ID.');
    }
    return;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://capteiofertas.com.br';
  
  let message = `📦 *Detalhes do Produto*\n\n`;
  message += `📝 *Titulo:* ${product.title}\n\n`;
  message += `💰 *Preco:* R$ ${product.price.toFixed(2)}\n`;
  if (product.originalPrice) {
    const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
    message += `💵 *Preco Original:* R$ ${product.originalPrice.toFixed(2)} (${discount}% OFF)\n`;
  }
  message += `🏪 *Loja:* ${product.storeName}\n`;
  if (product.category) message += `📂 *Categoria:* ${product.category}\n`;
  if (product.couponCode) message += `🎟️ *Cupom:* ${product.couponCode}\n`;
  message += `\n🔗 *Link:* ${siteUrl}/oferta/${product.id}\n`;
  message += `🆔 *ID:* \`${product.id}\`\n`;
  message += `📅 *Criado:* ${product.createdAt.toLocaleDateString('pt-BR')}`;

  const keyboard = new InlineKeyboard()
    .text('✏️ Titulo', `edit_prod_title_${product.id}`)
    .text('💰 Preco', `edit_prod_price_${product.id}`)
    .row()
    .text('💵 Preco Original', `edit_prod_origprice_${product.id}`)
    .text('🎟️ Cupom', `edit_prod_coupon_${product.id}`)
    .row()
    .text('📂 Categoria', `edit_prod_category_${product.id}`)
    .row()
    .text('🗑️ Deletar', `delete_prod_${product.id}`)
    .text('🔄 Atualizar', `refresh_prod_${product.id}`)
    .row()
    .text('⬅️ Voltar', 'prod_page_1');

  if (editMessage && ctx.callbackQuery) {
    // Check if message has photo (caption) or text
    const msg = ctx.callbackQuery.message;
    const hasPhoto = msg && 'photo' in msg;
    
    try {
      if (hasPhoto) {
        await ctx.editMessageCaption({
          caption: message,
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });
      } else {
        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });
      }
    } catch {
      // Message didn't change or error - send new message
      if (product.image) {
        try {
          await ctx.replyWithPhoto(product.image, {
            caption: message,
            parse_mode: 'Markdown',
            reply_markup: keyboard,
          });
        } catch {
          await ctx.reply(message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard,
          });
        }
      } else {
        await ctx.reply(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });
      }
    }
    await ctx.answerCallbackQuery();
  } else {
    if (product.image) {
      try {
        await ctx.replyWithPhoto(product.image, {
          caption: message,
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });
      } catch {
        await ctx.reply(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });
      }
    } else {
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    }
  }
}

// Refresh product detail
bot.callbackQuery(/^refresh_prod_(.+)$/, async (ctx) => {
  const productId = ctx.match[1];
  await showProductDetail(ctx, productId, true);
});

// Edit product title
bot.callbackQuery(/^edit_prod_title_(.+)$/, async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  
  const productId = ctx.match[1];
  await updateSession(chatId, BotState.EDITING_PRODUCT_TITLE, { editingProductId: productId });
  await ctx.reply('✏️ Digite o novo *titulo* do produto:', { parse_mode: 'Markdown' });
  await ctx.answerCallbackQuery();
});

// Edit product price
bot.callbackQuery(/^edit_prod_price_(.+)$/, async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  
  const productId = ctx.match[1];
  await updateSession(chatId, BotState.EDITING_PRODUCT_PRICE, { editingProductId: productId });
  await ctx.reply('💰 Digite o novo *preco* (ex: 99.90):', { parse_mode: 'Markdown' });
  await ctx.answerCallbackQuery();
});

// Edit product original price
bot.callbackQuery(/^edit_prod_origprice_(.+)$/, async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  
  const productId = ctx.match[1];
  await updateSession(chatId, BotState.EDITING_PRODUCT_ORIGINAL_PRICE, { editingProductId: productId });
  await ctx.reply('💵 Digite o novo *preco original* (ex: 199.90):\n\n_Envie 0 para remover_', { parse_mode: 'Markdown' });
  await ctx.answerCallbackQuery();
});

// Edit product coupon
bot.callbackQuery(/^edit_prod_coupon_(.+)$/, async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  
  const productId = ctx.match[1];
  await updateSession(chatId, BotState.EDITING_PRODUCT_COUPON, { editingProductId: productId });
  await ctx.reply('🎟️ Digite o *codigo do cupom*:\n\n_Envie "remover" para remover o cupom_', { parse_mode: 'Markdown' });
  await ctx.answerCallbackQuery();
});

// Edit product category
bot.callbackQuery(/^edit_prod_category_(.+)$/, async (ctx) => {
  const productId = ctx.match[1];
  
  const categoryKeyboard = new InlineKeyboard()
    .text('📱 Eletronicos', `set_prod_cat_${productId}_Eletronicos`).row()
    .text('👕 Moda', `set_prod_cat_${productId}_Moda`).row()
    .text('🏠 Casa', `set_prod_cat_${productId}_Casa`).row()
    .text('🎮 Games', `set_prod_cat_${productId}_Games`).row()
    .text('📚 Livros', `set_prod_cat_${productId}_Livros`).row()
    .text('💄 Beleza', `set_prod_cat_${productId}_Beleza`).row()
    .text('🍽️ Alimentos', `set_prod_cat_${productId}_Alimentos`).row()
    .text('⚽ Esportes', `set_prod_cat_${productId}_Esportes`).row()
    .text('❌ Remover categoria', `set_prod_cat_${productId}_null`).row()
    .text('⬅️ Voltar', `refresh_prod_${productId}`);
  
  const categoryText = '📂 *Escolha a nova categoria:*';
  
  // Check if message has photo (caption) or text
  const message = ctx.callbackQuery.message;
  const hasPhoto = message && 'photo' in message;
  
  try {
    if (hasPhoto) {
      await ctx.editMessageCaption({
        caption: categoryText,
        parse_mode: 'Markdown',
        reply_markup: categoryKeyboard,
      });
    } else {
      await ctx.editMessageText(categoryText, {
        parse_mode: 'Markdown',
        reply_markup: categoryKeyboard,
      });
    }
  } catch {
    await ctx.reply(categoryText, { parse_mode: 'Markdown', reply_markup: categoryKeyboard });
  }
  await ctx.answerCallbackQuery();
});

// Set product category
bot.callbackQuery(/^set_prod_cat_(.+)_(.+)$/, async (ctx) => {
  const productId = ctx.match[1];
  const category = ctx.match[2] === 'null' ? null : ctx.match[2];
  
  try {
    await prisma.product.update({
      where: { id: productId },
      data: { category },
    });
    
    revalidatePath('/');
    revalidatePath(`/oferta/${productId}`);
    
    await ctx.answerCallbackQuery({ text: category ? `Categoria: ${category}` : 'Categoria removida!' });
    await showProductDetail(ctx, productId, true);
  } catch {
    await ctx.answerCallbackQuery({ text: 'Erro ao atualizar!' });
  }
});

// Delete product confirmation
bot.callbackQuery(/^delete_prod_(.+)$/, async (ctx) => {
  const productId = ctx.match[1];
  
  const keyboard = new InlineKeyboard()
    .text('✅ Sim, deletar', `confirm_delete_prod_${productId}`)
    .text('❌ Cancelar', `refresh_prod_${productId}`);
  
  const confirmText = '⚠️ *Tem certeza que deseja deletar este produto?*\n\n_Esta acao nao pode ser desfeita._';
  
  // Check if message has photo (caption) or text
  const message = ctx.callbackQuery.message;
  const hasPhoto = message && 'photo' in message;
  
  try {
    if (hasPhoto) {
      await ctx.editMessageCaption({
        caption: confirmText,
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    } else {
      await ctx.editMessageText(confirmText, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    }
  } catch {
    // Fallback: send new message
    await ctx.reply(confirmText, { parse_mode: 'Markdown', reply_markup: keyboard });
  }
  await ctx.answerCallbackQuery();
});

// Confirm delete product
bot.callbackQuery(/^confirm_delete_prod_(.+)$/, async (ctx) => {
  const productId = ctx.match[1];
  
  try {
    const product = await prisma.product.delete({
      where: { id: productId },
    });
    
    revalidatePath('/');
    revalidatePath('/promocoes-do-dia');
    
    const deleteText = `🗑️ *Produto deletado!*\n\n_${product.title}_`;
    
    // Check if message has photo (caption) or text
    const message = ctx.callbackQuery.message;
    const hasPhoto = message && 'photo' in message;
    
    try {
      if (hasPhoto) {
        await ctx.editMessageCaption({
          caption: deleteText,
          parse_mode: 'Markdown',
        });
      } else {
        await ctx.editMessageText(deleteText, {
          parse_mode: 'Markdown',
        });
      }
    } catch {
      await ctx.reply(deleteText, { parse_mode: 'Markdown' });
    }
    await ctx.answerCallbackQuery({ text: 'Produto deletado!' });
  } catch {
    await ctx.answerCallbackQuery({ text: 'Erro ao deletar!' });
  }
});

// Helper to get/update session
async function getSession(chatId: number) {
  const session = await prisma.botSession.findUnique({
    where: { chatId: BigInt(chatId) },
  });
  return session;
}

async function updateSession(chatId: number, state: BotState, data: SessionData) {
  await prisma.botSession.upsert({
    where: { chatId: BigInt(chatId) },
    update: { state, data: data as object },
    create: { chatId: BigInt(chatId), state, data: data as object },
  });
}

async function clearSession(chatId: number) {
  await prisma.botSession.delete({
    where: { chatId: BigInt(chatId) },
  }).catch(() => {});
}

async function sendProductPreview(ctx: Context, data: SessionData) {
  let message = '📦 *Dados do produto:*\n\n';
  message += `🏪 Loja: ${data.storeName || 'Nao definida'}\n`;
  message += `📝 Titulo: ${data.title || '❌ Nao definido'}\n`;
  message += `💰 Preco: ${data.price ? `R$ ${data.price.toFixed(2)}` : '❌ Nao definido'}\n`;
  if (data.originalPrice) {
    const discount = Math.round(((data.originalPrice - (data.price || 0)) / data.originalPrice) * 100);
    message += `💵 Preco Original: R$ ${data.originalPrice.toFixed(2)} (${discount}% OFF)\n`;
  }
  if (data.couponCode) {
    message += `🎟️ Cupom: ${data.couponCode}\n`;
  }
  if (data.category) {
    message += `📂 Categoria: ${data.category}\n`;
  }
  message += `🖼️ Imagem: ${data.image ? '✅ Definida' : '❌ Nao definida'}\n\n`;
  message += 'Edite os campos ou publique:';

  const keyboard = new InlineKeyboard();

  keyboard.text(data.title ? '✏️ Editar Titulo' : '✏️ Adicionar Titulo', 'edit_title').row();
  keyboard.text(data.price ? '✏️ Editar Preco' : '✏️ Adicionar Preco', 'edit_price').row();
  keyboard.text('💵 Preco Original', 'edit_original_price').row();
  keyboard.text(data.couponCode ? `🎟️ Editar Cupom (${data.couponCode})` : '🎟️ Adicionar Cupom', 'add_coupon').row();
  keyboard.text('📂 Adicionar Categoria', 'add_category').row();
  keyboard.text(data.image ? '📸 Trocar Imagem' : '📸 Enviar Imagem', 'edit_image').row();
  keyboard.text('✅ Publicar', 'publish').text('❌ Cancelar', 'cancel');

  if (data.image) {
    try {
      await ctx.replyWithPhoto(data.image, {
        caption: message,
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
      return;
    } catch {
      // photo URL invalid or unavailable — fall through to text reply
    }
  }

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
}

// Generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens
    .trim();
}

// Start command
bot.command('start', async (ctx) => {
  await ctx.reply(
    '👋 Ola! Sou o bot de cadastro de ofertas e blog.\n\n' +
    '*Ofertas:*\n' +
    'Envie um link de produto para cadastrar uma oferta.\n' +
    '/produtos - Listar produtos cadastrados\n' +
    '/produto [id] - Ver/editar/deletar produto\n\n' +
    '*Blog:*\n' +
    '/newpost - Criar novo post\n' +
    '/posts - Listar posts\n\n' +
    '*Grupos:*\n' +
    '/grupos - Listar grupos cadastrados\n' +
    '/grupo [n] - Gerenciar grupo especifico\n\n' +
    '*Outros:*\n' +
    '/help - Ver todos os comandos\n' +
    '/cancel - Cancelar operacao atual',
    { parse_mode: 'Markdown' }
  );
});

// Help command
bot.command('help', async (ctx) => {
  await ctx.reply(
    '📖 *Comandos disponiveis:*\n\n' +
    '*Ofertas:*\n' +
    '• Envie um link de produto para cadastrar\n' +
    '• O bot extrai os dados automaticamente\n' +
    '• Edite e publique com os botoes\n' +
    '/produtos - Listar todos os produtos\n' +
    '/produto [id] - Ver detalhes e editar\n\n' +
    '*Blog:*\n' +
    '/newpost - Criar novo post no blog\n' +
    '/posts - Listar todos os posts\n' +
    '/publish\\_post\\_ID - Publicar post\n' +
    '/delete\\_post\\_ID - Deletar post\n\n' +
    '*Grupos (broadcast):*\n' +
    '/grupos - Listar grupos onde o bot esta\n' +
    '/grupo [n] - Configurar notificacoes\n\n' +
    '*Geral:*\n' +
    '/start - Menu inicial\n' +
    '/cancel - Cancelar operacao\n' +
    '/help - Esta mensagem',
    { parse_mode: 'Markdown' }
  );
});

// Cancel command
bot.command('cancel', async (ctx) => {
  const chatId = ctx.chat?.id;
  if (chatId) {
    await clearSession(chatId);
  }
  await ctx.reply('❌ Operacao cancelada.');
});

// ==================== BLOG COMMANDS ====================

// New post command
bot.command('newpost', async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  await updateSession(chatId, BotState.WAITING_BLOG_TITLE, {});
  await ctx.reply(
    '📝 *Criar novo post no blog*\n\n' +
    'Digite o *titulo* do post:',
    { parse_mode: 'Markdown' }
  );
});

// List posts command
bot.command('posts', async (ctx) => {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  if (posts.length === 0) {
    await ctx.reply('📭 Nenhum post encontrado.\n\nUse /newpost para criar um.');
    return;
  }

  let message = '📚 *Ultimos posts:*\n\n';
  for (const post of posts) {
    const status = post.published ? '✅' : '📝';
    message += `${status} *${post.title}*\n`;
    message += `   ID: \`${post.id}\`\n`;
    message += `   Slug: /${post.slug}\n`;
    message += `   ${post.published ? 'Publicado' : 'Rascunho'}\n\n`;
  }

  message += '_Comandos:_\n';
  message += '/publish\\_post\\_ID - Publicar\n';
  message += '/delete\\_post\\_ID - Deletar';

  await ctx.reply(message, { parse_mode: 'Markdown' });
});

// Publish post command
bot.hears(/^\/publish_post_(.+)$/, async (ctx) => {
  const postId = ctx.match[1];

  try {
    const post = await prisma.post.update({
      where: { id: postId },
      data: { published: true },
    });

    revalidatePath('/blog');
    revalidatePath(`/blog/${post.slug}`);

    // Broadcast to groups
    const broadcastResult = await broadcastBlogPost({
      id: post.id,
      title: post.title,
      slug: post.slug,
    });

    let message = `✅ Post publicado!\n\n*${post.title}*\n\nAcesse: /blog/${post.slug}`;
    
    if (broadcastResult.success > 0 || broadcastResult.failed > 0) {
      message += `\n\n📢 Broadcast: ${broadcastResult.success} grupos`;
      if (broadcastResult.failed > 0) {
        message += ` (${broadcastResult.failed} falhas)`;
      }
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch {
    await ctx.reply('❌ Post nao encontrado. Verifique o ID.');
  }
});

// Delete post command
bot.hears(/^\/delete_post_(.+)$/, async (ctx) => {
  const postId = ctx.match[1];

  try {
    const post = await prisma.post.delete({
      where: { id: postId },
    });

    revalidatePath('/blog');

    await ctx.reply(`🗑️ Post deletado: *${post.title}*`, { parse_mode: 'Markdown' });
  } catch {
    await ctx.reply('❌ Post nao encontrado. Verifique o ID.');
  }
});

// ==================== PRODUCT HANDLERS ====================

// Handle URLs
bot.hears(/https?:\/\/[^\s]+/, async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const url = ctx.match[0];
  
  await ctx.reply('🔍 Analisando o link... Por favor, aguarde.');

  try {
    const scrapedData = await scrapeUrl(url);
    const storeName = getStoreName(url);

    if (!scrapedData.success) {
      await ctx.reply(
        `❌ Nao consegui ler este link.\n\nErro: ${scrapedData.error}\n\n` +
        '📸 Envie uma foto do produto e depois eu peco os detalhes manualmente.'
      );
      await updateSession(chatId, BotState.WAITING_IMAGE, { url, storeName });
      return;
    }

    const sessionData: SessionData = {
      url,
      title: scrapedData.title || undefined,
      image: scrapedData.image || undefined,
      price: scrapedData.price || undefined,
      originalPrice: scrapedData.originalPrice || undefined,
      storeName,
      affiliateLink: url,
    };

    await updateSession(chatId, BotState.IDLE, sessionData);

    let message = '📦 *Dados encontrados:*\n\n';
    message += `🏪 Loja: ${storeName}\n`;
    message += `📝 Titulo: ${scrapedData.title || '❌ Nao encontrado'}\n`;
    message += `💰 Preco: ${scrapedData.price ? `R$ ${scrapedData.price.toFixed(2)}` : '❌ Nao encontrado'}\n`;
    if (scrapedData.originalPrice) {
      const discount = Math.round(((scrapedData.originalPrice - (scrapedData.price || 0)) / scrapedData.originalPrice) * 100);
      message += `💵 Preco Original: R$ ${scrapedData.originalPrice.toFixed(2)} (${discount}% OFF)\n`;
    }
    message += `🖼️ Imagem: ${scrapedData.image ? '✅ Encontrada' : '❌ Nao encontrada'}\n\n`;
    message += 'Voce pode editar os campos ou publicar diretamente:';

    const keyboard = new InlineKeyboard();
    
    if (!scrapedData.title) keyboard.text('✏️ Adicionar Titulo', 'edit_title');
    else keyboard.text('✏️ Editar Titulo', 'edit_title');
    
    keyboard.row();
    
    if (!scrapedData.price) keyboard.text('✏️ Adicionar Preco', 'edit_price');
    else keyboard.text('✏️ Editar Preco', 'edit_price');
    
    keyboard.row();
    keyboard.text('💵 Preco Original', 'edit_original_price');
    keyboard.row();
    keyboard.text('🎟️ Adicionar Cupom', 'add_coupon');
    keyboard.row();
    keyboard.text('📂 Adicionar Categoria', 'add_category');
    keyboard.row();
    
    if (!scrapedData.image) keyboard.text('📸 Enviar Imagem', 'edit_image');
    else keyboard.text('📸 Trocar Imagem', 'edit_image');
    
    keyboard.row();
    keyboard.text('✅ Publicar', 'publish').text('❌ Cancelar', 'cancel');

    if (scrapedData.image) {
      try {
        await ctx.replyWithPhoto(scrapedData.image, {
          caption: message,
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });
      } catch {
        await ctx.reply(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });
      }
    } else {
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    }

  } catch (error) {
    console.error('Error processing URL:', error);
    await ctx.reply(
      '❌ Ocorreu um erro ao processar o link. Tente novamente ou envie /cancel.'
    );
  }
});

// Handle photo uploads
bot.on('message:photo', async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const session = await getSession(chatId);
  
  if (!session || session.state !== BotState.WAITING_IMAGE) {
    await ctx.reply('Por favor, envie um link primeiro ou use /start.');
    return;
  }

  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  const fileId = photo.file_id;
  const file = await ctx.api.getFile(fileId);
  const imageUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

  const data = session.data as SessionData;
  data.image = imageUrl;

  if (data.title || data.price) {
    await updateSession(chatId, BotState.IDLE, data);
    await ctx.reply('✅ Imagem atualizada!');
    await sendProductPreview(ctx, data);
  } else {
    await updateSession(chatId, BotState.WAITING_MANUAL_DATA, data);
    await ctx.reply('✅ Foto recebida! Agora me envie o *titulo do produto*:', {
      parse_mode: 'Markdown',
    });
  }
});

// Handle callback queries (inline buttons)
bot.on('callback_query:data', async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) {
    await ctx.answerCallbackQuery({ text: 'Erro: chat nao encontrado.' });
    return;
  }

  const action = ctx.callbackQuery.data;
  
  // Handle blog publish from inline button
  if (action.startsWith('publish_blog_')) {
    const postId = action.replace('publish_blog_', '');
    
    try {
      const post = await prisma.post.update({
        where: { id: postId },
        data: { published: true },
      });

      revalidatePath('/blog');
      revalidatePath(`/blog/${post.slug}`);

      // Broadcast to groups
      const broadcastResult = await broadcastBlogPost({
        id: post.id,
        title: post.title,
        slug: post.slug,
      });

      let message = `✅ *Post publicado!*\n\n📝 *${post.title}*\n🔗 /blog/${post.slug}`;
      
      if (broadcastResult.success > 0 || broadcastResult.failed > 0) {
        message += `\n\n📢 Enviado para ${broadcastResult.success} grupos`;
        if (broadcastResult.failed > 0) {
          message += ` (${broadcastResult.failed} falhas)`;
        }
      }

      await ctx.editMessageText(message, { parse_mode: 'Markdown' });
      await ctx.answerCallbackQuery({ text: 'Post publicado!' });
    } catch {
      await ctx.answerCallbackQuery({ text: 'Erro ao publicar.' });
    }
    return;
  }
  
  if (action === 'keep_draft') {
    await ctx.editMessageText(
      ctx.callbackQuery.message?.text + '\n\n_Mantido como rascunho. Use /posts para ver._',
      { parse_mode: 'Markdown' }
    );
    await ctx.answerCallbackQuery({ text: 'Mantido como rascunho.' });
    return;
  }

  // Handle product actions
  const session = await getSession(chatId);
  
  if (!session) {
    await ctx.answerCallbackQuery({ text: 'Sessao expirada. Envie um novo link.' });
    return;
  }

  const data = session.data as SessionData;

  switch (action) {
    case 'edit_title':
      await updateSession(chatId, BotState.WAITING_TITLE, data);
      await ctx.reply('✏️ Digite o novo titulo do produto:');
      await ctx.answerCallbackQuery();
      break;

    case 'edit_price':
      await updateSession(chatId, BotState.WAITING_PRICE, data);
      await ctx.reply('💰 Digite o preco (ex: 99.90):');
      await ctx.answerCallbackQuery();
      break;

    case 'edit_original_price':
      await updateSession(chatId, BotState.WAITING_ORIGINAL_PRICE, data);
      await ctx.reply('💵 Digite o preco original (antes do desconto, ex: 199.90):');
      await ctx.answerCallbackQuery();
      break;

    case 'add_coupon':
      await updateSession(chatId, BotState.WAITING_COUPON, data);
      await ctx.reply('🎟️ Digite o codigo do cupom:');
      await ctx.answerCallbackQuery();
      break;

    case 'add_category':
      await updateSession(chatId, BotState.WAITING_CATEGORY, data);
      const categoryKeyboard = new InlineKeyboard()
        .text('📱 Eletronicos', 'cat_eletronicos').row()
        .text('👕 Moda', 'cat_moda').row()
        .text('🏠 Casa', 'cat_casa').row()
        .text('🎮 Games', 'cat_games').row()
        .text('📚 Livros', 'cat_livros').row()
        .text('💄 Beleza', 'cat_beleza').row()
        .text('🍽️ Alimentos', 'cat_alimentos').row()
        .text('⚽ Esportes', 'cat_esportes');
      
      await ctx.reply('📂 Escolha a categoria:', { reply_markup: categoryKeyboard });
      await ctx.answerCallbackQuery();
      break;

    case 'edit_image':
      await updateSession(chatId, BotState.WAITING_IMAGE, data);
      await ctx.reply('📸 Envie a imagem do produto:');
      await ctx.answerCallbackQuery();
      break;

    case 'publish':
      await publishProduct(ctx, data);
      await clearSession(chatId);
      await ctx.answerCallbackQuery({ text: '✅ Publicado!' });
      break;

    case 'cancel':
      await clearSession(chatId);
      await ctx.reply('❌ Cancelado. Envie um novo link para comecar.');
      await ctx.answerCallbackQuery();
      break;

    default:
      // Handle category selection
      if (action.startsWith('cat_')) {
        const categories: Record<string, string> = {
          cat_eletronicos: 'Eletronicos',
          cat_moda: 'Moda',
          cat_casa: 'Casa',
          cat_games: 'Games',
          cat_livros: 'Livros',
          cat_beleza: 'Beleza',
          cat_alimentos: 'Alimentos',
          cat_esportes: 'Esportes',
        };
        
        data.category = categories[action];
        await updateSession(chatId, BotState.IDLE, data);
        await ctx.reply(`✅ Categoria definida: ${data.category}`);
        await ctx.answerCallbackQuery();
        await sendProductPreview(ctx, data);
      }
      break;
  }
});

// Handle text messages (for manual input)
bot.on('message:text', async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const session = await getSession(chatId);
  
  if (!session || session.state === BotState.IDLE) {
    return;
  }

  const data = session.data as SessionData;
  const text = ctx.message.text;

  switch (session.state) {
    // Product edit states
    case BotState.EDITING_PRODUCT_TITLE: {
      if (!data.editingProductId) {
        await ctx.reply('❌ Erro: produto nao encontrado. Tente novamente.');
        await clearSession(chatId);
        return;
      }
      
      try {
        await prisma.product.update({
          where: { id: data.editingProductId },
          data: { title: text },
        });
        
        revalidatePath('/');
        revalidatePath(`/oferta/${data.editingProductId}`);
        
        await ctx.reply(`✅ Titulo atualizado!\n\nUse /produto ${data.editingProductId} para ver o produto.`);
        await clearSession(chatId);
      } catch {
        await ctx.reply('❌ Erro ao atualizar. Verifique o ID.');
      }
      break;
    }

    case BotState.EDITING_PRODUCT_PRICE: {
      if (!data.editingProductId) {
        await ctx.reply('❌ Erro: produto nao encontrado. Tente novamente.');
        await clearSession(chatId);
        return;
      }
      
      const newPrice = parseFloat(text.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (isNaN(newPrice) || newPrice <= 0) {
        await ctx.reply('❌ Preco invalido. Digite novamente (ex: 99.90):');
        return;
      }
      
      try {
        await prisma.product.update({
          where: { id: data.editingProductId },
          data: { price: newPrice },
        });
        
        revalidatePath('/');
        revalidatePath(`/oferta/${data.editingProductId}`);
        
        await ctx.reply(`✅ Preco atualizado: R$ ${newPrice.toFixed(2)}\n\nUse /produto ${data.editingProductId} para ver o produto.`);
        await clearSession(chatId);
      } catch {
        await ctx.reply('❌ Erro ao atualizar. Verifique o ID.');
      }
      break;
    }

    case BotState.EDITING_PRODUCT_ORIGINAL_PRICE: {
      if (!data.editingProductId) {
        await ctx.reply('❌ Erro: produto nao encontrado. Tente novamente.');
        await clearSession(chatId);
        return;
      }
      
      const newOriginalPrice = parseFloat(text.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (isNaN(newOriginalPrice)) {
        await ctx.reply('❌ Preco invalido. Digite novamente (ex: 199.90):');
        return;
      }
      
      try {
        await prisma.product.update({
          where: { id: data.editingProductId },
          data: { originalPrice: newOriginalPrice === 0 ? null : newOriginalPrice },
        });
        
        revalidatePath('/');
        revalidatePath(`/oferta/${data.editingProductId}`);
        
        const msg = newOriginalPrice === 0 
          ? '✅ Preco original removido!' 
          : `✅ Preco original atualizado: R$ ${newOriginalPrice.toFixed(2)}`;
        await ctx.reply(`${msg}\n\nUse /produto ${data.editingProductId} para ver o produto.`);
        await clearSession(chatId);
      } catch {
        await ctx.reply('❌ Erro ao atualizar. Verifique o ID.');
      }
      break;
    }

    case BotState.EDITING_PRODUCT_COUPON: {
      if (!data.editingProductId) {
        await ctx.reply('❌ Erro: produto nao encontrado. Tente novamente.');
        await clearSession(chatId);
        return;
      }
      
      const coupon = text.toLowerCase() === 'remover' ? null : text.toUpperCase();
      
      try {
        await prisma.product.update({
          where: { id: data.editingProductId },
          data: { couponCode: coupon },
        });
        
        revalidatePath('/');
        revalidatePath(`/oferta/${data.editingProductId}`);
        
        const msg = coupon ? `✅ Cupom atualizado: ${coupon}` : '✅ Cupom removido!';
        await ctx.reply(`${msg}\n\nUse /produto ${data.editingProductId} para ver o produto.`);
        await clearSession(chatId);
      } catch {
        await ctx.reply('❌ Erro ao atualizar. Verifique o ID.');
      }
      break;
    }

    case BotState.WAITING_TITLE:
      data.title = text;
      await updateSession(chatId, BotState.IDLE, data);
      await ctx.reply('✅ Titulo atualizado!');
      await sendProductPreview(ctx, data);
      break;

    case BotState.WAITING_PRICE: {
      const price = parseFloat(text.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (isNaN(price)) {
        await ctx.reply('❌ Preco invalido. Digite novamente (ex: 99.90):');
        return;
      }
      data.price = price;
      await updateSession(chatId, BotState.IDLE, data);
      await ctx.reply(`✅ Preco atualizado: R$ ${price.toFixed(2)}`);
      await sendProductPreview(ctx, data);
      break;
    }

    case BotState.WAITING_ORIGINAL_PRICE: {
      const originalPrice = parseFloat(text.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (isNaN(originalPrice)) {
        await ctx.reply('❌ Preco invalido. Digite novamente (ex: 199.90):');
        return;
      }
      data.originalPrice = originalPrice;
      await updateSession(chatId, BotState.IDLE, data);
      await ctx.reply(`✅ Preco original atualizado: R$ ${originalPrice.toFixed(2)}`);
      await sendProductPreview(ctx, data);
      break;
    }

    case BotState.WAITING_COUPON:
      data.couponCode = text.toUpperCase();
      await updateSession(chatId, BotState.IDLE, data);
      await ctx.reply(`✅ Cupom adicionado: ${data.couponCode}`);
      await sendProductPreview(ctx, data);
      break;

    case BotState.WAITING_MANUAL_DATA:
      data.title = text;
      await updateSession(chatId, BotState.WAITING_PRICE, data);
      await ctx.reply('✅ Titulo salvo! Agora me envie o *preco* (ex: 99.90):', {
        parse_mode: 'Markdown',
      });
      break;

    // Blog states
    case BotState.WAITING_BLOG_TITLE:
      data.blogTitle = text;
      data.blogSlug = generateSlug(text);
      await updateSession(chatId, BotState.WAITING_BLOG_CONTENT, data);
      await ctx.reply(
        `✅ Titulo: *${text}*\n` +
        `📎 Slug: \`${data.blogSlug}\`\n\n` +
        'Agora digite o *conteudo* do post:\n\n' +
        '_Dica: Voce pode usar varias mensagens. Quando terminar, envie /done_',
        { parse_mode: 'Markdown' }
      );
      break;

    case BotState.WAITING_BLOG_CONTENT:
      if (text === '/done') {
        // Save blog post
        if (!data.blogTitle || !data.blogContent) {
          await ctx.reply('❌ Titulo ou conteudo vazio. Use /newpost para comecar novamente.');
          await clearSession(chatId);
          return;
        }

        try {
          const post = await prisma.post.create({
            data: {
              title: data.blogTitle,
              slug: data.blogSlug || generateSlug(data.blogTitle),
              content: data.blogContent,
              published: false,
            },
          });

          await clearSession(chatId);
          
          const keyboard = new InlineKeyboard()
            .text('✅ Publicar agora', `publish_blog_${post.id}`)
            .text('📝 Manter rascunho', 'keep_draft');

          await ctx.reply(
            `✅ *Post criado com sucesso!*\n\n` +
            `📝 *${post.title}*\n` +
            `📎 Slug: \`${post.slug}\`\n` +
            `📊 Status: Rascunho\n\n` +
            `ID: \`${post.id}\``,
            { parse_mode: 'Markdown', reply_markup: keyboard }
          );
        } catch (error: any) {
          if (error.code === 'P2002') {
            await ctx.reply('❌ Ja existe um post com esse slug. Tente outro titulo.');
          } else {
            await ctx.reply('❌ Erro ao criar post. Tente novamente.');
          }
        }
      } else {
        // Append content
        data.blogContent = data.blogContent ? data.blogContent + '\n\n' + text : text;
        await updateSession(chatId, BotState.WAITING_BLOG_CONTENT, data);
        await ctx.reply('✅ Conteudo adicionado. Continue escrevendo ou envie /done para finalizar.');
      }
      break;
  }
});

async function publishProduct(ctx: Context, data: SessionData) {
  try {
    if (!data.title || !data.price || !data.image || !data.url) {
      await ctx.reply(
        '❌ Dados incompletos! Certifique-se de ter:\n' +
        '• Titulo\n' +
        '• Preco\n' +
        '• Imagem\n' +
        '• Link'
      );
      return;
    }

    const product = await prisma.product.create({
      data: {
        title: data.title,
        affiliateLink: data.affiliateLink || data.url,
        originalLink: data.url,
        image: data.image,
        price: data.price,
        originalPrice: data.originalPrice || null,
        couponCode: data.couponCode || null,
        storeName: data.storeName || 'Loja',
        category: data.category || null,
      },
    });

    revalidatePath('/');
    revalidatePath('/promocoes-do-dia');

    // Broadcast to groups
    const broadcastResult = await broadcastProduct({
      id: product.id,
      title: data.title,
      price: data.price,
      originalPrice: data.originalPrice || null,
      storeName: data.storeName || 'Loja',
      category: data.category || null,
    });

    let message = '✅ *Produto publicado com sucesso!*\n\n';
    message += `📝 ${data.title}\n`;
    message += `💰 R$ ${data.price.toFixed(2)}\n`;
    if (data.originalPrice) {
      const discount = Math.round(((data.originalPrice - data.price) / data.originalPrice) * 100);
      message += `🔥 ${discount}% OFF\n`;
    }
    if (data.couponCode) message += `🎟️ Cupom: ${data.couponCode}\n`;
    message += `\n🔗 ID: ${product.id}`;
    
    if (broadcastResult.success > 0 || broadcastResult.failed > 0) {
      message += `\n\n📢 Enviado para ${broadcastResult.success} grupos`;
      if (broadcastResult.failed > 0) {
        message += ` (${broadcastResult.failed} falhas)`;
      }
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('Error publishing product:', error);
    await ctx.reply('❌ Erro ao publicar o produto. Tente novamente.');
  }
}

// Export webhook handler for Next.js API route
export const POST = webhookCallback(bot, 'std/http');
