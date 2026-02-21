const config = require('config');
const crypto = require("crypto");
const qs = require('qs');
//const db = require('../../config/database'); // Import kết nối DB của bạn

function sortObject(obj) {
    let sorted = {};
    let str = [];
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (let key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}

const vnpayIpn = async (req, res, next) => {
    let vnp_Params = req.query;
    let secureHash = vnp_Params['vnp_SecureHash'];

    let orderId = vnp_Params['vnp_TxnRef'];
    let rspCode = vnp_Params['vnp_ResponseCode'];
    let vnp_Amount = vnp_Params['vnp_Amount'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);
    let secretKey = config.get('vnp_HashSecret');
    let signData = qs.stringify(vnp_Params, { encode: false });
    let hmac = crypto.createHmac("sha512", secretKey);
    let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

    if (secureHash === signed) { // 1. Kiểm tra checksum
        try {
            // 2. Kiểm tra đơn hàng trong DB
            // Truy vấn lấy đơn hàng theo orderID
            const rows = await db.query('SELECT * FROM Orders WHERE orderID = ?', [orderId]);
            const order = rows[0]; // Lấy đơn hàng đầu tiên tìm được

            if (order) {
                // 3. Kiểm tra số tiền (VNPAY gửi sang đã nhân 100)
                let amountInDb = order.amount * 100;
                if (amountInDb == vnp_Amount) {
                    
                    // 4. Kiểm tra trạng thái hiện tại (Chỉ xử lý nếu đang là 'pending')
                    if (order.status === 'pending') {
                        if (rspCode == "00") {
                            // Thành công: Cập nhật status sang 'success'
                            //await db.query('UPDATE Orders SET status = ? WHERE orderID = ?', ['success', orderId]);
                            console.log(`--- Đơn hàng ${orderId} đã được cập nhật thành công ---`);
                            res.status(200).json({ RspCode: '00', Message: 'Success' });
                        } else {
                            // Thất bại: Cập nhật status sang 'fail'
                            //await db.query('UPDATE Orders SET status = ? WHERE orderID = ?', ['fail', orderId]);
                            console.log(`--- Đơn hàng ${orderId} đã được cập nhật thành công ---`); 
                            res.status(200).json({ RspCode: '00', Message: 'Success' });
                        }
                    } else {
                        // Đơn hàng đã được cập nhật trước đó rồi (ví dụ do khách reload trang)
                        res.status(200).json({ RspCode: '02', Message: 'This order has been updated to the payment status' });
                    }
                } else {
                    res.status(200).json({ RspCode: '04', Message: 'Amount invalid' });
                }
            } else {
                res.status(200).json({ RspCode: '01', Message: 'Order not found' });
            }
        } catch (error) {
            console.error('Lỗi Database tại IPN:', error.message);
            res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
        }
    } else {
        res.status(200).json({ RspCode: '97', Message: 'Checksum failed' });
    }
};

module.exports = {
    vnpayIpn
};