import sql from 'mssql';
import { getSqlPool } from '../db.js';
import { json, readJson } from '../utils/http.js';

const SEPAY_PATHS = new Set([
  '/api/sepay/webhook',
  '/api/payment/sepay-webhook',
  '/hooks/sepay-payment',
  '/sepay/webhook',
  '/sepay-webhook',
  '/api/sepay',
]);

/**
 * Xử lý Webhook thanh toán tự động từ SePay
 */
export async function handleSepayWebhook(req, res, pathname) {
  const isSepayPath = SEPAY_PATHS.has(pathname) || pathname.includes('sepay');

  if (isSepayPath && req.method === 'POST') {
    try {
      // 1. Kiểm tra API Key (nếu đã cấu hình trong .env)
      const sepayApiKey = process.env.SEPAY_API_KEY;
      const authHeader = req.headers['authorization'] || '';
      if (sepayApiKey && authHeader) {
        const expectedAuth = `Apikey ${sepayApiKey.trim()}`;
        if (authHeader !== expectedAuth) {
          console.warn('[SePay Webhook] Sai API Key từ SePay:', authHeader);
          return json(res, 401, { error: 'Unauthorized: Invalid SePay API Key' });
        }
      }

      // 2. Đọc dữ liệu JSON từ SePay
      const body = await readJson(req, 20000).catch(() => ({}));
      console.log('[SePay Webhook] Nhận request path:', pathname, 'body:', JSON.stringify(body));

      const {
        id: transactionId,
        gateway,
        accountNumber,
        content = '',
        description = '',
        transferType = 'in',
        transferAmount = 0,
        referenceCode = '',
      } = body || {};

      // Nếu là gói ping kiểm tra webhook từ SePay Dashboard (chưa có nội dung đơn hàng)
      if (!content && !description && (!transferAmount || transferAmount <= 0)) {
        return json(res, 200, {
          success: true,
          message: 'SePay Webhook verified successfully (Test Ping)!',
        });
      }

      // Chỉ xử lý giao dịch tiền vào
      if (transferType && transferType.toLowerCase() !== 'in') {
        return json(res, 200, {
          success: true,
          message: 'Bỏ qua vì không phải giao dịch tiền vào.',
        });
      }

      const fullText = `${content} ${description} ${body.code || ''}`.toUpperCase();

      // 3. Trích xuất mã đơn hàng từ nội dung chuyển khoản (GORISE ORD-123456, ORD-123456, GORISE 123456...)
      const orderMatch = fullText.match(/ORD[-_ ]?([0-9]{6})/i) || fullText.match(/GORISE[-_ ]?([0-9]{6})/i) || fullText.match(/\b([0-9]{6})\b/);
      let searchOrderCode = '';
      let searchCleanCode = '';

      if (orderMatch) {
        searchCleanCode = `ORD${orderMatch[1]}`;
        searchOrderCode = `ORD-${orderMatch[1]}`;
      }

      const pool = await getSqlPool();

      // Tìm kiếm đơn hàng trong Database
      let order = null;
      if (searchOrderCode || searchCleanCode) {
        const orderReq = pool.request();
        orderReq.input('orderCode', sql.NVarChar(64), searchOrderCode);
        orderReq.input('cleanCode', sql.NVarChar(64), searchCleanCode);
        const orderRes = await orderReq.query(`
          SELECT TOP 1 id, order_code, customer_name, customer_phone, total_amount, payment_status, order_status
          FROM orders
          WHERE order_code = @orderCode OR REPLACE(order_code, '-', '') = @cleanCode
        `);
        order = orderRes.recordset?.[0];
      }

      // Nếu chưa tìm thấy theo Regex, quét tìm mã đơn hàng xuất hiện trong chuỗi
      if (!order) {
        const scanRes = await pool.request().query(`
          SELECT TOP 20 id, order_code, customer_name, customer_phone, total_amount, payment_status, order_status
          FROM orders
          WHERE payment_status = 'pending'
          ORDER BY created_at DESC
        `);
        for (const o of scanRes.recordset || []) {
          const rawCode = String(o.order_code || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
          if (rawCode && fullText.includes(rawCode)) {
            order = o;
            break;
          }
        }
      }

      if (!order) {
        console.warn('[SePay Webhook] Không tìm thấy đơn hàng khớp nội dung:', fullText);
        return json(res, 200, {
          success: true,
          message: 'Giao dịch đã ghi nhận nhưng không khớp đơn hàng nào trên hệ thống.',
        });
      }

      // 4. Cập nhật trạng thái đơn hàng thành 'paid' (Đã thanh toán)
      const updateReq = pool.request();
      updateReq.input('id', sql.NVarChar(64), order.id);
      updateReq.input('note', sql.NVarChar(500), `Thanh toán tự động qua SePay (${gateway || 'Ngân hàng'}) - GD: ${transactionId || referenceCode || 'N/A'}, Số tiền: ${transferAmount}đ`);

      await updateReq.query(`
        UPDATE orders
        SET payment_status = 'paid',
            note = CASE WHEN note IS NULL OR note = '' THEN @note ELSE note + ' | ' + @note END,
            updated_at = GETDATE()
        WHERE id = @id;
      `);

      console.log(`[SePay Webhook] CẬP NHẬT THÀNH CÔNG: Đơn hàng ${order.order_code} đã thanh toán ${transferAmount}đ!`);

      return json(res, 200, {
        success: true,
        message: 'Xác nhận thanh toán đơn hàng thành công!',
        orderCode: order.order_code,
        amount: transferAmount,
      });
    } catch (err) {
      console.error('[SePay Webhook] Lỗi xử lý:', err);
      return json(res, 500, { error: 'Lỗi máy chủ xử lý SePay Webhook: ' + err.message });
    }
  }

  // GET hỗ trợ test nhanh từ trình duyệt
  if (isSepayPath && req.method === 'GET') {
    return json(res, 200, {
      status: 'active',
      service: 'GORISE SePay Payment Webhook Gateway',
      method: 'POST only for SePay events',
      timestamp: new Date().toISOString(),
    });
  }

  return false;
}
